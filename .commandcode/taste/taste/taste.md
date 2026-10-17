# Taste
- Communicates in casual Indonesian, terse style (e.g. "dibuat multi contex", "nextjs bun sqlit gimana?"); expects the agent to reply in informal Indonesian ("gua/lu"). Confidence: 0.7
- Prefers the **multi-context** domain-docs layout — a root `GLOSSARY-MAP.md` pointing at one `GLOSSARY.md` (plus context-scoped `docs/adr/`) per context — rather than single-context. Confidence: 0.75
- Prefers local-only development with no deployment step — runs projects in the browser via `bun run dev` rather than setting up deploy pipelines. Confidence: 0.6
- For full-stack apps, prefers at least two testing seams — pure unit tests for domain logic plus integration tests for API routes against a real SQLite DB (SSE checks folded into the API seam) — rather than a single seam. Confidence: 0.6
- When separating concerns like backend and frontend, wants agent config set up per-context (shared root config + per-context `GLOSSARY.md` via `GLOSSARY-MAP.md`) rather than fully splitting into separate repos. Confidence: 0.6
- Prefers **Bun** as package manager/runtime over npm (e.g., for Next.js projects, uses `bun create next-app`, `bun install`, `bun run dev`); avoids installing npm separately. Confidence: 0.75
- Prefers self-hosted, zero-external-account stacks: avoids services requiring sign-up/cloud accounts (rejected Supabase on that basis) in favor of self-contained options like SQLite + SSE on own infra. Confidence: 0.65
