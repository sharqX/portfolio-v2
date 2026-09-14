/**
 * In-page scrolling for the header nav's "/#id" links, without leaving the
 * fragment in the address bar.
 *
 * A click scrolls to the target and swaps in a hash-free URL via
 * `history.pushState`, so the bar always reads as a clean page path.
 * `popstate` re-scrolls (or returns to top) when the resulting history
 * entries are used with the browser back/forward buttons. Landing on a
 * fresh load with a hash already in the URL (an old bookmark, a shared
 * link) scrolls to that section once, then drops the hash the same way.
 *
 * Deliberately scoped to `.nav` links only — this does not touch the
 * `#main` skip-link, which needs the browser's native fragment navigation
 * (and the focus move that comes with it) to stay accessible.
 */

interface AnchorState {
  anchor: string;
}

function scrollToId(id: string, behavior: ScrollBehavior): boolean {
  if (id === "") {
    window.scrollTo({ top: 0, behavior });
    return true;
  }
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior, block: "start" });
  return true;
}

export function initAnchorNav(): void {
  const behavior: ScrollBehavior = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches
    ? "auto"
    : "smooth";

  document.querySelector(".nav")?.addEventListener("click", (event) => {
    const link = (event.target as HTMLElement).closest("a[href]");
    if (!link) return;

    const match = link.getAttribute("href")?.match(/^\/?#([\w-]*)$/);
    if (!match || !scrollToId(match[1], behavior)) return;

    event.preventDefault();
    history.pushState(
      { anchor: match[1] } satisfies AnchorState,
      "",
      location.pathname + location.search,
    );
  });

  window.addEventListener("popstate", (event) => {
    scrollToId((event.state as AnchorState | null)?.anchor ?? "", "auto");
  });

  if (location.hash && scrollToId(location.hash.slice(1), "auto")) {
    history.replaceState(
      { anchor: location.hash.slice(1) } satisfies AnchorState,
      "",
      location.pathname + location.search,
    );
  }
}
