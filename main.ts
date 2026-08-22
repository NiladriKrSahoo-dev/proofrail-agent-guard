import { Hono } from "hono";
import { serveStatic } from "hono/deno";

const app = new Hono();

// SECURITY: harden every response with browser security headers.
//
// Clickjacking control is expressed via CSP `frame-ancestors` (not
// X-Frame-Options) because Freebuff embeds this app in an iframe from
// freebuff.com / *.vly.sh — X-Frame-Options: DENY would break the preview.
//
// `style-src 'unsafe-inline'` is required by React inline styles, Framer
// Motion, and the Vly dev toolbar. `connect-src` covers Convex (cloud +
// websocket) and Freebuff endpoints (OTP delivery, error monitoring).
const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://freebuff.com https://*.freebuff.com https://integrations.freebuff.com https://auth.freebuff.app",
    "frame-ancestors 'self' https://freebuff.com https://*.freebuff.com",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

app.use("*", async (c, next) => {
  await next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    c.header(name, value);
  }
});

// 1) Serve anything in /assets/**
app.use("/assets/*", serveStatic({ root: "./dist/assets" }));

// 2) Catch *all* other files in dist (CSS, JS, images, etc.)
app.use("*", serveStatic({ root: "./dist" }));

// 3) Fallback to index.html for the SPA
app.get("*", serveStatic({ path: "./dist/index.html" }));

Deno.serve(app.fetch);
