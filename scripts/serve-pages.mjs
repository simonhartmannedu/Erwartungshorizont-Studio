import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../.pages/", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".json": "application/json", ".mp4": "video/mp4", ".woff2": "font/woff2" };
const server = createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
    let path = resolve(root, `.${pathname}`);
    if (path !== resolve(root) && !path.startsWith(`${resolve(root)}${sep}`)) throw new Error("Invalid path");
    if (statSync(path).isDirectory()) path = join(path, "index.html");
    const stat = statSync(path);
    if (!stat.isFile()) throw new Error("Not a file");
    response.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream", "Content-Length": stat.size, "Cache-Control": "no-store" });
    createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
  }
});
server.listen(4174, "127.0.0.1", () => console.log("Pages artifact: http://127.0.0.1:4174"));
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
