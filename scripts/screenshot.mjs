#!/usr/bin/env node
/**
 * Quick screenshot helper for the running dev server.
 *
 * Usage:
 *   node scripts/screenshot.mjs <path> [out.png] [--full]
 *
 * Examples:
 *   node scripts/screenshot.mjs /login
 *   node scripts/screenshot.mjs /admin/categorias/nuevo out/categorias.png --full
 *   node scripts/screenshot.mjs / --width=1440
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/screenshot.mjs <path> [out.png] [--full] [--width=W] [--height=H]");
  process.exit(1);
}

const positional = args.filter((a) => !a.startsWith("--"));
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith("--"))
    .map((a) => a.replace(/^--/, "").split("=").concat([true])),
);

const path = positional[0];
const outPath = positional[1] ?? `screenshots/${path.replace(/\/$/, "home").replace(/^\//, "").replaceAll("/", "_") || "home"}.png`;

const base = process.env.SITE_URL ?? "http://localhost:3000";
const url = base + path;
const width = Number(flags.width ?? 1280);
const height = Number(flags.height ?? 800);
const fullPage = Boolean(flags.full);

await mkdir(dirname(outPath), { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

console.log(`→ ${url}`);
const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
console.log(`  status: ${resp?.status() ?? "?"}`);

await page.screenshot({ path: outPath, fullPage });
console.log(`✓ saved: ${outPath}`);

await browser.close();
