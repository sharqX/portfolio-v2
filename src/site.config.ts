export interface SocialLink {
  label: string;
  href: string;
  icon: string;
  handle: string;
}

export const site = {
  name: "Sharique Zarar Rahman",
  shortName: "Sharique",
  monogram: "SR",
  role: "Software Engineer",
  url: "https://v2.zararsharique.com",
  domain: "v2.zararsharique.com",
  locale: "en",

  /* One-line description used for <meta name="description"> and OG cards. */
  description:
    "Software engineer working on cloud infrastructure and deployment tooling — AWS, Terraform, Kubernetes, and the pipelines in between.",

  email: "rsharique24@gmail.com",

  resumeUrl:
    "https://drive.usercontent.google.com/u/0/uc?id=1RqT5WxpXJJY3qrGvEeyV0HqeZ6PtV6VR&export=download",
  resumeViewUrl:
    "https://drive.google.com/file/d/1RqT5WxpXJJY3qrGvEeyV0HqeZ6PtV6VR/view",

  /* Flip `open` to false to hide the availability badge in the hero. */
  availability: {
    open: false,
    label: "Open to work",
  },

  /* Google Analytics. Set to null to remove the tag entirely. Only loads in production builds. */
  analyticsId: "G-P4W5E7FPB0" as string | null,

  socials: [
    {
      label: "GitHub",
      href: "https://github.com/sharqX",
      icon: "ph:github-logo-bold",
      handle: "sharqX",
    },
    {
      label: "LinkedIn",
      href: "https://linkedin.com/in/shariquerahman",
      icon: "ph:linkedin-logo-bold",
      handle: "shariquerahman",
    },
    {
      label: "X",
      href: "https://x.com/zarar_sharique",
      icon: "ph:x-logo-bold",
      handle: "zarar_sharique",
    },
    {
      label: "Discord",
      href: "https://discord.gg/PFGd5NsjbE",
      icon: "ph:discord-logo-bold",
      handle: "Join the server",
    },
  ] satisfies SocialLink[],

  nav: [
    { label: "Work", href: "/#work" },
    { label: "Projects", href: "/#projects" },
    { label: "Writing", href: "/#writing" },
    { label: "Contact", href: "/#contact" },
  ],
};

export type Site = typeof site;
