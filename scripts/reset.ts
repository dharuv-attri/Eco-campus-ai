import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const configured = process.env.DATABASE_PATH || "data/ecocampus.db";
const file = path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);

for (const suffix of ["", "-wal", "-shm"]) {
  const target = `${file}${suffix}`;
  if (fs.existsSync(target)) {
    fs.rmSync(target);
    console.log(`Removed ${target}`);
  }
}

const uploads = path.join(process.cwd(), "data", "uploads");
if (fs.existsSync(uploads)) {
  for (const entry of fs.readdirSync(uploads)) {
    if (entry === ".gitkeep") continue;
    fs.rmSync(path.join(uploads, entry), { force: true, recursive: true });
  }
  console.log("Cleared local uploads.");
}

const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", "scripts/seed.ts"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
