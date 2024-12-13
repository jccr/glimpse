import path from "path";
import { defineConfig } from "vite";
import compression from "vite-plugin-compression";
import Sitemap from "vite-plugin-sitemap";
import dynamicImport from "vite-plugin-dynamic-import";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
  },
  plugins: [
    dynamicImport({
      filter(id) {
        if (id.includes("/node_modules/shiki")) {
          return true;
        }
      },
    }),
    compression({
      // Optional configuration options
      verbose: true, // Enable verbose logging
      filter: /\.js$|\.css$/, // Compress only JavaScript and CSS files
      disable: false, // Disable compression for specific files or directories
      threshold: 1024, // Compress files larger than this size (in bytes)
      algorithm: "gzip", // Choose the compression algorithm (gzip or brotli)
      ext: ".gz", // Output file extension for compressed files
      compressionOptions: {
        // Optional compression options for gzip or brotli
      },
    }),

    Sitemap({ hostname: "http://localhost:5173" }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
      supported: {
        "top-level-await": true,
      },
    },
  },
});
