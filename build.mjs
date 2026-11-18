// Usage: node build.mjs <qa|prod> [--dir|--win|--mac|--linux]
// Packages the app for one environment into dist/<env>/ with its own name and app id.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const envs = JSON.parse(readFileSync(new URL("./config/environments.json", import.meta.url), "utf8"));
const [key = "prod", ...flags] = process.argv.slice(2);
const env = envs[key];
if (!env || key === "dev") { console.error("Use qa or prod. Dev runs live: npm run dev"); process.exit(1); }
const r = spawnSync(process.execPath, [require.resolve("electron-builder/cli.js"), ...flags,
  `-c.productName=${env.productName}`, `-c.appId=${env.appId}`, `-c.directories.output=dist/${key}`, `-c.extraMetadata.studioEnv=${key}`],
  { stdio: "inherit" });
process.exit(r.status ?? 1);
