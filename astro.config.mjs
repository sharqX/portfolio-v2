import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";

export default defineConfig({
  site: "https://v2.zararsharique.com",
  trailingSlash: "ignore",
  integrations: [mdx(), sitemap(), icon()],
  markdown: {
    shikiConfig: {
      /* Both themes are emitted; light values inline, dark as CSS variables
         that prose.css activates. See the .astro-code rules there. */
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: "light",
      wrap: true,
    },
  },
});
