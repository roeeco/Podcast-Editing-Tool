# Student Podcast Studio | אולפן פודקאסטים לסטודנטים 🎙️

Student Podcast Studio is a professional, offline-first web application designed specifically for students (especially in teacher-training programs like M.Teach) to record, write, edit, and mix 1-minute educational podcasts. It provides integrated script templates, a timing helper, interactive navigation cards, and live background music search via the Freesound API.

---

## What the Tool Does

- **Interactive Script Editor**: Write script notes, use pre-defined Hebrew academic podcast templates (e.g., alternative evaluation debates, sociology panels, Martin Buber's dialogical relations, SEL classroom management), and see live word counts and estimated speech times.
- **Multi-Track Recording & Upload**: Record multiple microphone inputs directly in the browser or upload existing audio files (`.mp3`, `.wav`, `.m4a`).
- **Precision Trimming & Mixing**: Control volume, trim the start/end of each track individually, re-order tracks, and merge or mix them.
- **Freesound Integration**: Search and download high-quality ambient sound effects or background music loops directly through an integrated Freesound search bar.
- **Dual Visual Themes**: Choose between eye-safe Dark Mode and a crisp Light Mode.

---

## Local Installation

To run the Student Podcast Studio locally on your computer:

1. **Clone or Download** this repository.
2. Open your terminal in the project's root directory.
3. Install the required dependencies:
   ```bash
   npm install
   ```
4. Set up your environment variables (see below).
5. Start the development server (which launches the Express API server and Vite preview simultaneously):
   ```bash
   npm run dev
   ```
6. Open your browser and navigate to `http://localhost:3000`.

---

## Environment Variables (`.env` / `.env.local`)

This application uses a full-stack architecture (Express + Vite) to keep your third-party API keys safe. Rather than making requests directly from the client which would expose your keys, the client proxies through the local Node.js server.

Create a `.env` (or `.env.local`) file in the root directory:

```env
# Port on which the application will run
PORT=3000

# Freesound API Client Token
# Get your token by registering at https://freesound.org/apiv2/apply/
FREESOUND_API_KEY="your_freesound_api_token_here"
```

*Note: For security reasons, never commit `.env` or files containing your real API keys to public repositories.*

---

## Browser Compatibility Notes for Microphone Recording

Recording audio directly in a web browser relies on the **Web MediaDevices API** (`navigator.mediaDevices.getUserMedia`). For security and user privacy, modern browsers enforce strict rules:

1. **Secure Origin Requirement (HTTPS / Localhost)**:
   - Microphone recording **will only work** on secure origins.
   - For local development, `http://localhost:3000` or `http://127.0.0.1:3000` is considered secure.
   - If deploying to Render, Vercel, or any other cloud provider, **HTTPS must be enabled** (e.g., `https://your-app.onrender.com`). If you access the site via HTTP, the microphone icon will be disabled or throw a permission error.
2. **Permission Consent**:
   - The first time you click "Record", the browser will prompt you for permission to access your microphone. You must click **Allow**.
   - If you accidentally block it, click the lock icon 🔒 next to the URL in your address bar and reset the microphone permission.
3. **Supported Browsers**:
   - Fully compatible with modern desktop and mobile browsers (Chrome, Firefox, Safari, Edge, Opera).
   - On iOS (iPhone/iPad), audio recording is fully supported in Safari and modern Chrome/Firefox instances running iOS 14.5+.

---

## Privacy & Storage Explanation

Your privacy and data ownership are a top priority:

- **100% Offline-First**: No audio recordings, microphone streams, or script contents are uploaded to our servers.
- **High-Performance Database (IndexedDB)**: Audio recordings and tracks are stored directly inside your browser's sandboxed storage database (**IndexedDB**), allowing you to save large audio tracks (several megabytes each) without worrying about size limits.
- **LocalStorage**: Your script texts, podcast names, participant lists, and studio settings are saved in your browser's **LocalStorage**.
- **Data Persistence**: Your recordings and scripts will persist even if you close the tab or restart your computer. However, clearing your browser cache or deleting site data *will* wipe this local database.

---

## Backup, Import, and Export Instructions

Because storage is entirely local to your browser, you should back up your work often:

### 1. Backing Up & Saving (Export Workspace)
- Use the **"יצוא גיבוי / Export Workspace"** button inside the app. This compiles all your recorded tracks, trimmed segments, and scripts into a single, structured `.zip` package.
- Download this ZIP file to your computer.

### 2. Restoring & Loading (Import Workspace)
- To resume work on another computer, open the studio and click **"יבוא גיבוי / Import Workspace"**.
- Upload your previously exported ZIP package. The app will immediately restore your precise tracks, volumes, and script editor state.

### 3. Mixing & Final Export
- Once your 1-minute podcast is complete, click **"מיזוג ויצוא פודקאסט / Merge & Export"** to download the final mixed high-quality audio file containing all tracks mixed at their custom volume settings.

---

## Deployment Notes

### 🚀 Custom Node/Express Server Deployment (Render, Cloud Run, Heroku)
Since this application includes a Node.js server (`server.ts`) that proxies the Freesound API, you must deploy it as a full-stack container or Node.js service:

- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Port Handling**: The application automatically binds to the `PORT` environment variable provided by the platform (Render/Cloud Run default).
- **Environment variables**: Ensure you add `FREESOUND_API_KEY` to your hosting platform's Dashboard Secrets/Environment Settings.

### ⚡ Static-Only SPA Deployment (Netlify, Vercel, GitHub Pages)
If you wish to deploy this as a static-only Single Page Application (SPA):
- The frontend will run beautifully, but Freesound proxy search requests (`/api/freesound`) will fail because there is no backend server.
- To bypass this on Netlify/Vercel, you can rewrite the `/api/freesound` endpoint using serverless functions (Netlify Functions / Vercel Serverless) or configure client-side token entry (though this exposes your client token to the browser).
