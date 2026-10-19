import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { copyFileSync, createReadStream, mkdirSync } from "node:fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

const repositoryVideoDir = path.resolve(import.meta.dirname, "../video");
const directoryMediaFiles = [
  "5200-183786525.mp4",
  "218489.mp4",
  "ES_Magic, Spell, Holy Magic, Ethereal, Incantation, Cast - Epidemic Sound (1).mp3",
] as const;

function directoryMediaAssets() {
  const installMiddleware = (server: { middlewares: { use: (handler: (req: any, res: any, next: () => void) => void) => void } }) => {
    server.middlewares.use((req, res, next) => {
      if (!req.url) return next();

      let pathname = "";
      try {
        pathname = decodeURIComponent(new URL(req.url, "http://network-map.local").pathname);
      } catch {
        return next();
      }

      const filename = pathname.startsWith("/") ? pathname.slice(1) : pathname;
      if (!directoryMediaFiles.includes(filename as (typeof directoryMediaFiles)[number])) return next();

      const sourcePath = path.join(repositoryVideoDir, filename);
      res.statusCode = 200;
      res.setHeader("Content-Type", filename.endsWith(".mp3") ? "audio/mpeg" : "video/mp4");
      res.setHeader("Cache-Control", "public, max-age=3600");
      createReadStream(sourcePath).on("error", next).pipe(res);
    });
  };

  return {
    name: "directory-media-assets",
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware,
    writeBundle() {
      const outputDir = path.resolve(import.meta.dirname, "dist/public");
      mkdirSync(outputDir, { recursive: true });
      for (const filename of directoryMediaFiles) {
        copyFileSync(path.join(repositoryVideoDir, filename), path.join(outputDir, filename));
      }
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    directoryMediaAssets(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
