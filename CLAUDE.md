# Jarvis (app-profile page)

> One-line purpose: A single static HTML page describing the private "Jarvis"/personal-os AI assistant and its Plaid usage — published for Plaid's Compliance Center.

## Project facts

- **Verify commands:** `none (static site)` — single `index.html` with inline CSS, no build/lint/test, no package.json.
- **Stack:** Static HTML + inline CSS. No framework, no JS, no dependencies.
- **Deploy:** GitHub Pages from `main` → https://ryanjflores6.github.io/jarvis-app/ (origin: github.com/ryanjavier06-oss/jarvis-app). Pushing to `main` publishes; there is no build step.
- **Priority tracker:** `spec/FIX_PLAN.md` (not yet present — create if work warrants it).

## Hard rules (project-specific)

- This page is a **Plaid compliance artifact**, not marketing. Plaid's Compliance Center requires it for OAuth-enabled financial institutions. Every factual claim about Plaid scope and data handling must stay TRUE to the real Jarvis implementation (the private `personal-os` repo).
- Do not overstate or invent security/storage details. The page currently asserts: read-only `transactions` scope only (no payment/transfer/money-movement), Fernet (AES-128-CBC + HMAC) at-rest token encryption, PBKDF2-SHA256 @ 600k iterations, local SQLite, no third-party data sharing. Change these only to match reality, never to look better.
- Keep it a single self-contained file (no external CSS/JS/CDN). Adding a toolchain or dependencies is scope creep for a one-page compliance doc — push back before introducing one.
- The actual assistant lives in the private `personal-os` repo; this repo is public and contains no secrets or app code. Keep it that way.
