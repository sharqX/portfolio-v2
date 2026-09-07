---
name: new-post
description: Scaffold a new blog post at src/content/blog/<slug>.md with schema-correct frontmatter. Use when asked to create/start/draft a new blog post or writing entry.
---

Create a new Markdown post in `src/content/blog/`.

1. Read `src/content.config.ts` and use the **current** `blog` collection schema — do not trust the field list below if it disagrees.
2. Derive the filename from the title: lowercase, kebab-case, `.md`. The filename is the URL slug (`src/content/blog/<slug>.md` → `/blog/<slug>`). Do not overwrite an existing file.
3. Ask the user for anything required that you can't infer (title at minimum). Default `date` to today, `draft: true`, and `tags` to a single best-guess tag the user can edit.

Frontmatter shape (verify against the schema):

```md
---
title: "<title>"
date: <YYYY-MM-DD>
summary: "<one-sentence summary>"
tags: ["<tag>"]
accent: blue # one of: red | blue | green | yellow
draft: true
---

<body — a heading and a sentence to start>
```

4. After writing, run `npm run check` to confirm the frontmatter validates.

Notes: `draft: true` posts render in `npm run dev` but are excluded from `npm run build`. Seeded posts are AI drafts; match the user's real voice, not theirs.
