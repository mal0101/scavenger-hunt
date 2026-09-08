import fs from "fs";
import path from "path";

function findProjectEnvLocal(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, ".env.local");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Minimal .env.local loader for Playwright's Node runtime. Next.js loads this
 * file itself for the app; Playwright's runner does not, so we mirror the
 * dotenv behavior (KEY=VALUE, optional surrounding quotes) to keep the test
 * secrets aligned with the running app. Searches upward from the cwd so it
 * works regardless of where the suite is invoked.
 *
 * `.env.local` values OVERRIDE the ambient process env. The Playwright worker
 * pre-loads the repo `.env` (production/Neon credentials) into the process
 * before any spec module runs; without this precedence the browser suite's DB
 * helpers would write test fixtures into the NEON database while `next dev`
 * serves the LOCAL one (Next.js itself prefers `.env.local` over `.env`).
 */
export function loadEnvLocal(): void {
  const envPath = findProjectEnvLocal();
  if (!envPath) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}