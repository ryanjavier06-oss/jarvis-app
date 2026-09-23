# Jarvis (app-profile page)

> One self-contained static HTML page describing the private Jarvis/personal-os assistant for Plaid's Compliance Center.

## Project facts

- **Verify commands:** `node scripts/verify-page.mjs && node --test tests/verify-page.test.mjs` — checks document boundaries, external script/style dependencies, and local fragment/resource references. This is a static-page integrity check, not a semantic review.
- **Stop gate:** `node scripts/verify-page.mjs`
- **isolation:** worktree
- **push_policy:** main-gated
- **open_pr:** false
- **trust:** propose
- **Stack:** One HTML file with inline CSS; no framework, JavaScript or dependencies.
- **Deploy:** GitHub Pages from `main` publishes to `https://ryanjflores6.github.io/jarvis-app/`; origin is `github.com/ryanjavier06-oss/jarvis-app`.
- **Priority tracker:** `spec/FIX_PLAN.md` (not present; create only if work warrants it).

- **Browser acceptance:** `node scripts/verify-ui.mjs` renders desktop/mobile offline; run `node --test tests/*.test.mjs` for validator regressions. Setup: `npm ci` and `npx playwright install chromium`; an existing installation can be supplied through `CLAUDE_PLAYWRIGHT_ROOT`. Rendering does not certify factual claims.

## Hard rules

- This is a Plaid compliance artifact, not marketing. Compare every Plaid scope and data-handling claim to the current implementation in `command-center/jarvis` (`personal-os` is frozen) before changing it.
- Do not overstate security/storage details. Current claims include transactions-only read access, Fernet encryption, PBKDF2-SHA256 at 600,000 iterations, local SQLite, and no third-party sharing; change only when the implementation supports it.
- Keep the page self-contained. No external CSS, JavaScript, CDN, framework, or dependency without Ryan's agreement.
- Keep this public repository free of secrets and application code.
- A green static validator does not establish that the factual compliance claims remain true.
