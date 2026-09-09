import { defineCollection } from "astro:content";
import { z } from "zod";
import { glob, file } from "astro/loaders";

const accent = z.enum(["red", "blue", "green", "yellow"]);

const work = defineCollection({
  loader: file("src/content/work.json"),
  schema: z.object({
    order: z.number(),
    company: z.string(),
    companyUrl: z.url().optional(),
    role: z.string(),
    /* Leave as an empty string to hide the date range on the timeline. */
    period: z.string().default(""),
    location: z.string().optional(),
    highlights: z.array(z.string()).min(1),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    /* Optional link to a fuller external write-up (currently Notion). */
    url: z.url().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).min(1),
    accent: accent.default("blue"),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    accent: accent.default("blue"),
    draft: z.boolean().default(false),
  }),
});

export const collections = { work, projects, blog };
