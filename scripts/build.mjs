import { copyFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve, join, sep } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const candidates = [process.env.MOON, "moon", join(homedir(), ".moon", "bin", "moon")].filter(Boolean);
let build;
for (const candidate of candidates) {
  if (candidate.includes(sep) && !existsSync(candidate)) continue;
  build = spawnSync(candidate, ["build", "--target", "js", "--release"], { cwd: root, stdio: "inherit" });
  if (build.error?.code === "ENOENT") continue;
  break;
}
if (!build || build.status !== 0) process.exit(build?.status ?? 1);

const destination = resolve(root, "web", "engine.js");
await mkdir(resolve(root, "web"), { recursive: true });
await copyFile(resolve(root, "_build/js/release/build/echo_case.js"), destination);
console.log("Built MoonBit game rules → web/engine.js");
