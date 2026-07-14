import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const FREESOUND_API_KEY = process.env.FREESOUND_API_KEY;

// Simple in-memory cache for repeated search queries
const searchCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simple rate limiter map
const ipRequests = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const ipStr = Array.isArray(ip) ? ip[0] : String(ip);
  const now = Date.now();
  
  const record = ipRequests.get(ipStr);
  if (!record || now > record.resetTime) {
    ipRequests.set(ipStr, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
  }
  
  record.count += 1;
  next();
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // API Route for Freesound proxy with robust checks
  app.get("/api/freesound", rateLimiter, async (req, res) => {
    try {
      const { type, q, category, page, sort } = req.query;
      
      // Limit q length to protect against buffer issues (80-120 chars)
      let queryStr = q ? String(q).trim() : "";
      if (queryStr.length > 100) {
        queryStr = queryStr.substring(0, 100);
      }

      // Allow only known categories/types
      const typeStr = type ? String(type).trim() : "music";
      if (typeStr !== "music" && typeStr !== "soundeffects") {
        return res.status(400).json({ error: "Invalid asset category requested" });
      }

      const categoryStr = category ? String(category).trim() : ""; // intro, outro, transition

      // Build filter on server-side (do not allow arbitrary strings from client)
      let filterStr = "";
      if (categoryStr === "intro" || categoryStr === "outro" || categoryStr === "transition") {
        filterStr = "duration:[0 TO 10]";
      }

      // Sort allowlist: score, rating_desc, downloads_desc, created_desc, duration_asc
      const ALLOWED_SORTS = ["score", "rating_desc", "downloads_desc", "created_desc", "duration_asc"];
      const sortStr = sort ? String(sort).trim() : "score";
      const validatedSort = ALLOWED_SORTS.includes(sortStr) ? sortStr : "score";

      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.set("query", queryStr || "podcast");
      if (FREESOUND_API_KEY) {
        queryParams.set("token", FREESOUND_API_KEY);
      }
      // Request extra metadata
      queryParams.set("fields", "id,name,tags,previews,duration,username,license,url,avg_rating,score");
      queryParams.set("page_size", "50");
      queryParams.set("group_by_pack", "1");
      queryParams.set("sort", validatedSort);

      if (filterStr) {
        queryParams.set("filter", filterStr);
      }

      if (page) {
        const pageNum = parseInt(String(page), 10);
        if (!isNaN(pageNum) && pageNum > 0) {
          queryParams.set("page", String(pageNum));
        }
      }

      // Serve from memory cache if fresh
      const cacheKey = `${typeStr}:${queryStr}:${categoryStr}:${page || 1}:${validatedSort}`;
      const cached = searchCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`Serving cached Freesound search: ${cacheKey}`);
        return res.json(cached.data);
      }

      if (!FREESOUND_API_KEY) {
        return res.status(503).json({ error: "Search service is temporarily unconfigured" });
      }

      const freesoundUrl = `https://freesound.org/apiv2/search/text/?${queryParams.toString()}`;
      
      console.log(`Proxying search request to Freesound: ${freesoundUrl.replace(FREESOUND_API_KEY, "KEY_HIDDEN")}`);
      
      // Timeout with AbortController (6 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(freesoundUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Freesound API search returned non-200: ${response.status}`);
        return res.json({ results: [] });
      }
      
      const data = await response.json();

      // Store in memory cache
      searchCache.set(cacheKey, { timestamp: Date.now(), data });

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching from Freesound:", error);
      res.status(500).json({ error: "Failed to retrieve search results from provider" });
    }
  });

  // Proxy endpoint to securely fetch and validate compressed sound files under a size limit
  app.get("/api/freesound/download", rateLimiter, async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ error: "Missing sound URL" });
      }

      const targetUrl = String(url);

      // SSRF validation: only allow requests to trusted freesound.org domains
      const isFreesoundUrl = /^https:\/\/([a-z0-9-]+\.)?freesound\.org\//i.test(targetUrl);
      if (!isFreesoundUrl) {
        return res.status(400).json({ error: "Invalid download source" });
      }

      // Fetch the file with a timeout of 10 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch sound file from source" });
      }

      // Validate Content-Length if present
      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader) {
        const contentLength = parseInt(contentLengthHeader, 10);
        // Limit to 6MB
        const MAX_SIZE = 6 * 1024 * 1024;
        if (contentLength > MAX_SIZE) {
          return res.status(400).json({ error: "File is too heavy (maximum 6MB allowed)" });
        }
      }

      // Validate Content-Type is a compressed format
      const contentType = response.headers.get("content-type") || "";
      const ALLOWED_MIME_TYPES = [
        "audio/mpeg", "audio/mp3", "audio/ogg", "audio/webm", 
        "audio/x-m4a", "audio/mp4", "audio/aac", "audio/x-aac",
        "audio/3gpp", "audio/3gpp2"
      ];
      const isAllowed = ALLOWED_MIME_TYPES.some(mime => contentType.toLowerCase().includes(mime));
      
      if (contentType && !isAllowed) {
        return res.status(400).json({ error: "Unsupported audio format. Only compressed formats are allowed." });
      }

      // Set headers and stream response
      res.setHeader("Content-Type", contentType || "audio/mpeg");
      if (contentLengthHeader) {
        res.setHeader("Content-Length", contentLengthHeader);
      }
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Safety check: verify raw size in case Content-Length header was missing/spoofed
      if (buffer.length > 6 * 1024 * 1024) {
        return res.status(400).json({ error: "File exceeds the maximum limit of 6MB" });
      }

      return res.send(buffer);
    } catch (error: any) {
      console.error("Error proxying sound download:", error);
      return res.status(500).json({ error: "Failed to download sound file securely" });
    }
  });

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to 127.0.0.1 in local mode unless deliberately deployed (production)
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
  app.listen(PORT, host, () => {
    console.log(`Server running on http://${host}:${PORT}`);
  });
}

startServer();
