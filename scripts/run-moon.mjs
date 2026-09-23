import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, sep } from "node:path";

const command = process.argv[2];
if (!command || !["check", "test"].includes(command)) {
  console.error("Usage: node scripts/run-moon.mjs <check|test>");
  process.exit(2);
}
const candidates = [process.env.MOON, "moon", join(homedir(), ".moon", "bin", "moon")].filter(Boolean);
let result;
for (const candidate of candidates) {
  if (candidate.includes(sep) && !existsSync(candidate)) continue;
  result = spawnSync(candidate, [command], { stdio: "inherit" });
  if (result.error?.code === "ENOENT") continue;
  break;
}
if (!result || result.status !== 0) process.exit(result?.status ?? 1);
