# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — dev server at http://localhost:4321 (draft posts are visible here)
- `npm run check` — `astro check`: type-checks components and validates content-collection frontmatter against the Zod schemas
- `npm run build` — static build to `dist/` (draft posts excluded)
- `npm run preview` — serve the built `dist/`
- `npm run format` — Prettier (`prettier-plugin-astro`) write across the repo; `npm run format:check` to verify only. A `PostToolUse` hook already runs Prettier on each file Claude edits.

There is no test framework. `npm run check && npm run build` is the only correctness gate — run both before opening a PR (or use `/verify`). Local Node is 18; CI and Docker use Node 22 — assume 22 is available.

## Content is data, not markup

Page content lives in data files, not `.astro` templates:

- `src/site.config.ts` — name, socials, résumé URLs, availability badge, `analyticsId`
- `src/content/work.json` — timeline entries; `"period": ""` hides the date range until filled in
- `src/content/projects/<slug>.md` — project write-ups; the filename is the URL slug (`/projects/<slug>`). Frontmatter carries the card fields (`title`, `summary`, `tags`, `accent`, `featured`, optional external `url`); the body is the on-site case study. `draft: true` renders in `dev` but is excluded from `build`
- `src/content/blog/<slug>.md` — posts; the filename is the URL slug. `draft: true` renders in `dev` but is excluded from `build`
- `src/content.config.ts` — Zod schemas for all three collections (this file is at `src/`, not `src/content/`). A schema mismatch fails `astro check` and the build.

The three seeded blog posts are AI-written first-person drafts — review before publishing. The project write-up bodies are stubs pointing at the external Notion write-ups — flesh them out before relying on them.

## Architecture

- Static Astro site, no client framework or islands — `src/scripts/*.ts` are the only client-side JS, each imported and invoked from a `<script>` block in `src/layouts/Base.astro`.
- Three layouts wrap all pages: `Base.astro` (head/meta/OG tags, font imports, theme-init script, `Nav`/`Footer`/`AmbientBackdrop`) is used directly by `src/pages/index.astro` and `blog/index.astro`/`projects/index.astro`; `Post.astro` and `Project.astro` wrap `Base` for the `/blog/<slug>` and `/projects/<slug>` detail routes respectively.
- Theming (`src/scripts/theme.ts`): an inline script in `Base.astro`'s `<head>` sets `data-theme` on `<html>` from `localStorage` before first paint (avoids a flash); `theme.ts` then wires the toggle button and a `prefers-color-scheme` listener that only applies while no explicit choice is stored.
- Scroll reveals (`src/scripts/reveal.ts`): a single `IntersectionObserver` watches every `[data-reveal]` element and adds `.is-visible` once, then unobserves; no-ops under `prefers-reduced-motion`.
- `src/pages/rss.xml.ts` and the sitemap integration derive their entries from the `blog`/`projects` content collections directly — new posts/projects need no separate registration.

## Styling

- All theme values live in `src/styles/tokens.css`. Never hardcode a hex value in a component.
- Dark values are duplicated in both the `@media (prefers-color-scheme: dark)` and the `:root[data-theme='dark']` blocks of `tokens.css` — update both.
- Motion animates only `transform` / `opacity` and must respect `prefers-reduced-motion`.
- Plain CSS in `src/styles/`; there is no CSS framework.

## Git & deploy

- Work on a feature branch and open a PR to `main`. PRs run build + check only.
- **Push to `main` is a live production deploy to v2.zararsharique.com** (GitHub Actions SSHes to the host, which does `git reset --hard origin/main && docker compose up -d --build` in `/opt/apps/portfolio_v2` — the image is built on the host, no registry). It runs alongside the current site at `zararsharique.com`, which this pipeline never touches. Never push to `main` unprompted.
