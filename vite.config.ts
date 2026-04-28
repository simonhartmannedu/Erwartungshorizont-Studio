import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handlePdfExtractRequest } from "./server/pdfRuntime.mjs";
import { handlePdfSuggestRequest } from "./server/pdfSuggest";

type RequestLike = {
  method?: string;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

const readJsonBody = async (request: RequestLike) =>
  new Promise<unknown>((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += typeof chunk === "string" ? chunk : String(chunk ?? "");
    });
    request.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw) as unknown);
      } catch {
        reject(new Error("Ungültiges JSON"));
      }
    });
    request.on("error", reject);
  });

export default defineConfig(({ mode }) => ({
  base: mode === "development" ? "/" : "./",
  plugins: [
    react(),
    {
      name: "pdf-import-dev-routes",
      configureServer(server) {
        server.middlewares.use("/api/pdf-suggest", async (request: RequestLike, response) => {
          if (request.method !== "POST") {
            response.statusCode = 405;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ error: { code: "method_not_allowed", message: "Nur POST ist erlaubt." } }));
            return;
          }

          try {
            const payload = await readJsonBody(request);
            const result = await handlePdfSuggestRequest(payload);
            response.statusCode = result.status;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(result.body));
          } catch {
            response.statusCode = 400;
            response.setHeader("Content-Type", "application/json");
            response.end(
              JSON.stringify({
                error: {
                  code: "invalid_json",
                  message: "Die Anfrage konnte nicht gelesen werden.",
                },
              }),
            );
          }
        });

        server.middlewares.use("/api/pdf-extract", async (request: RequestLike, response) => {
          if (request.method !== "POST") {
            response.statusCode = 405;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ error: { code: "method_not_allowed", message: "Nur POST ist erlaubt." } }));
            return;
          }

          try {
            const payload = await readJsonBody(request);
            const result = await handlePdfExtractRequest(payload);
            response.statusCode = result.status;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(result.body));
          } catch {
            response.statusCode = 400;
            response.setHeader("Content-Type", "application/json");
            response.end(
              JSON.stringify({
                error: {
                  code: "invalid_json",
                  message: "Die Anfrage konnte nicht gelesen werden.",
                },
              }),
            );
          }
        });
      },
    },
  ],
  server: {
    watch: {
      ignored: [
        "**/.flatpak-builder/**",
        "**/dist/**",
      ],
    },
  },
}));
