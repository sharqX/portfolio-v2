---
name: verify
description: Run the repo's full correctness gate — astro check (types + content schema validation) then astro build. Use before opening a PR or whenever asked to verify changes work.
---

This repo has no test framework. Verification is two commands, run in order:

1. `npm run check` — `astro check`: TypeScript + `.astro` component types, and Zod validation of all content-collection frontmatter (`src/content/work.json`, `src/content/projects.json`, `src/content/blog/*.md` against `src/content.config.ts`).
2. `npm run build` — full static build to `dist/`.

Steps:

- Run both commands (stop and report if `check` fails; a failing check almost always means a content-file field violates its schema).
- If a `prettier`/`format:check` script exists in `package.json`, run it too.
- Report pass/fail for each with the relevant output. Do not describe changes as verified unless both passed.

Local Node is 18; CI and Docker use Node 22. If a failure looks version-related, say so.
