import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const FREESOUND_API_KEY = process.env.FREESOUND_API_KEY;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Freesound proxy
  app.get("/api/freesound", async (req, res) => {
    try {
      const { type, q } = req.query;
      const query = q ? encodeURIComponent(String(q)) : "music";
      
      if (!FREESOUND_API_KEY) {
        throw new Error("FREESOUND_API_KEY is not set. Please set it in the environment.");
      }

      // Freesound API endpoint
      const freesoundUrl = `https://freesound.org/apiv2/search/text/?query=${query}&token=${FREESOUND_API_KEY}&fields=id,name,tags,previews,duration,username`;
      
      console.log(`Proxying request to Freesound: ${freesoundUrl.replace(FREESOUND_API_KEY, "KEY_HIDDEN")}`);
      
      const response = await fetch(freesoundUrl);
      if (!response.ok) {
        console.warn(`Freesound API error: ${response.status} ${response.statusText}`);
        return res.json({ results: [] });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching from Freesound:", error);
      res.status(500).json({ error: "Failed to fetch from Freesound API", details: error.message });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
