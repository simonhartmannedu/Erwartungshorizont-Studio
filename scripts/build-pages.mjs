import { cpSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const stage = join(root, ".pages");
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

for (const [script, outDir] of [["build", ".pages/app"], ["build:demo", ".pages/demo"]]) {
  const result = spawnSync("npm", ["run", script, "--", "--outDir", outDir], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
cpSync(join(root, "landing"), stage, { recursive: true });
// This optional local preview asset is explicitly excluded from deployment.
for (const app of ["app", "demo"]) rmSync(join(stage, app, "signature.svg"), { force: true });
console.log("Pages artifact built: landing page, /app/ and /demo/.");
