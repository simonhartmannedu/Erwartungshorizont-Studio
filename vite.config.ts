import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handlePdfExtractRequest } from "./server/pdfRuntime.mjs";
import { handlePdfSuggestRequest } from "./server/pdfSuggest";

type RequestLike = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

const MAX_PDF_REQUEST_BYTES = 12 * 1024 * 1024;

class RequestBodyTooLargeError extends Error {}

const readJsonBody = async (request: RequestLike, maxBytes = MAX_PDF_REQUEST_BYTES) =>
  new Promise<unknown>((resolve, reject) => {
    let raw = "";
    let receivedBytes = 0;
    let settled = false;
    const contentLength = request.headers?.["content-length"];
    const declaredBytes = Number(Array.isArray(contentLength) ? contentLength[0] : contentLength);

    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      reject(new RequestBodyTooLargeError());
      return;
    }

    request.on("data", (chunk) => {
      if (settled) return;
      const value = typeof chunk === "string" ? chunk : String(chunk ?? "");
      receivedBytes += Buffer.byteLength(value);
      if (receivedBytes > maxBytes) {
        settled = true;
        reject(new RequestBodyTooLargeError());
        return;
      }
      raw += value;
    });
    request.on("end", () => {
      if (settled) return;
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
          } catch (error) {
            response.statusCode = error instanceof RequestBodyTooLargeError ? 413 : 400;
            response.setHeader("Content-Type", "application/json");
            response.end(
              JSON.stringify({
                error: {
                  code: error instanceof RequestBodyTooLargeError ? "request_too_large" : "invalid_json",
                  message: error instanceof RequestBodyTooLargeError
                    ? "Die Anfrage ist zu groß."
                    : "Die Anfrage konnte nicht gelesen werden.",
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
          } catch (error) {
            response.statusCode = error instanceof RequestBodyTooLargeError ? 413 : 400;
            response.setHeader("Content-Type", "application/json");
            response.end(
              JSON.stringify({
                error: {
                  code: error instanceof RequestBodyTooLargeError ? "request_too_large" : "invalid_json",
                  message: error instanceof RequestBodyTooLargeError
                    ? "Die Anfrage ist zu groß."
                    : "Die Anfrage konnte nicht gelesen werden.",
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
