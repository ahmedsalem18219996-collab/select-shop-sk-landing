#!/usr/bin/env node
// Non-destructive release gate for SELECT SHOP WOMEN on an isolated dynamic host.
// This script NEVER deploys, switches the homepage, calls admin mutations, or modifies DNS.
const originArg = process.env.WOMEN_STAGING_ORIGIN || process.argv[2];
if (!originArg) {
  console.error("Set WOMEN_STAGING_ORIGIN to the independent HTTPS WOMEN deployment URL.");
  process.exit(2);
}
let base;
try { base = new URL(originArg); } catch { console.error("Invalid URL"); process.exit(2); }
if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname !== "/") {
  console.error("Use a clean HTTPS origin such as https://women-preview.example.workers.dev/");
  process.exit(2);
}
const host = base.hostname.toLowerCase();
if (host === "selectshopeg.com" || host.endsWith(".selectshopeg.com") || host.endsWith(".netlify.app")) {
  console.error("Safety gate: use a separate working origin; never test live domain or Egypt-blocked Netlify as cutover target.");
  process.exit(2);
}
const checks = [
  { path: "/api/health", type: "application/json", validate: (body) => body?.status === "ok" && body?.service === "select-shop-women" },
  { path: "/api/catalog?limit=1", type: "application/json", validate: (body) => Array.isArray(body?.items) && (body?.nextCursor === null || typeof body?.nextCursor === "string") },
  { path: "/", type: "text/html", validate: (body) => /<html\b/i.test(body) },
  { path: "/admin/login", type: "text/html", validate: (body) => /<form\b/i.test(body) },
];
let failures = 0;
for (const item of checks) {
  try {
    const target = new URL(item.path, base);
    const response = await fetch(target, {
      redirect: "manual",
      headers: { "Accept": item.type, "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(15000)
    });
    const type = response.headers.get("content-type") || "";
    if (response.status !== 200 || !type.includes(item.type)) throw Error("HTTP " + response.status + " (" + type + ")");
    const body = item.type === "application/json" ? await response.json() : await response.text();
    if (!item.validate(body)) throw Error("Unexpected response shape");
    console.log("PASS", item.path);
  } catch (err) {
    failures++;
    console.error("FAIL", item.path, "-", err.message);
  }
}
if (failures) {
  console.error("STOP: WOMEN staging is not ready; do not replace SELECT SHOP homepage.");
  process.exit(1);
}
console.log("PASS basic HTTP gates only. Remaining mandatory manual gates: Egyptian mobile network, owner login, draft product+image save in WOMEN Supabase, public product, variant/pricing, checkout and no supplier dispatch.");
console.log("No automatic homepage switch is permitted.");
