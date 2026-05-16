import { defineConfig } from "prisma/config";
import * as fs from "fs";
import * as path from "path";

// Manually parse .env since dotenvx may intercept dotenv
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set in .env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url,
  },
});
