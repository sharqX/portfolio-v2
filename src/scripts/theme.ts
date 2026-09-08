/**
 * Theme switching.
 *
 * Three states, only two of which are ever stored: an explicit "light" or
 * "dark" choice lands in localStorage and sets `data-theme` on <html>; with
 * nothing stored the attribute is absent and the CSS media query decides, so
 * the page follows the system and keeps following it if the system changes.
 *
 * The initial attribute is set by an inline script in <head> (see Base.astro)
 * so there is no flash of the wrong theme before this module loads.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const CANVAS = { light: "#FBFCFD", dark: "#0A0E11" } as const;

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    /* Private mode, or site data blocked. Fall back to the system theme. */
    return null;
  }
}

function resolvedTheme(): Theme {
  return storedTheme() ?? (darkQuery().matches ? "dark" : "light");
}

function syncMeta(theme: Theme): void {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", CANVAS[theme]);
}

function syncButton(button: HTMLButtonElement, theme: Theme): void {
  const next = theme === "dark" ? "light" : "dark";
  button.setAttribute("aria-label", `Switch to ${next} theme`);
  button.setAttribute("title", `Switch to ${next} theme`);
}

export function initTheme(): void {
  const button = document.querySelector<HTMLButtonElement>(
    "[data-theme-toggle]",
  );
  const root = document.documentElement;

  syncMeta(resolvedTheme());

  if (!button) return;

  /* The control does nothing without this script, so it ships hidden. */
  button.hidden = false;
  syncButton(button, resolvedTheme());

  button.addEventListener("click", () => {
    const next: Theme = resolvedTheme() === "dark" ? "light" : "dark";

    /* Crossfade the colour change, then get out of the way so hover
       transitions keep their own timings. */
    root.setAttribute("data-theme-switching", "");
    window.setTimeout(() => root.removeAttribute("data-theme-switching"), 240);

    root.setAttribute("data-theme", next);
    syncMeta(next);
    syncButton(button, next);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Choice applies to this page view only. */
    }
  });

  /* Follow the system while the visitor has not chosen for themselves. */
  darkQuery().addEventListener("change", () => {
    if (storedTheme()) return;
    const theme = resolvedTheme();
    syncMeta(theme);
    syncButton(button, theme);
  });
}
