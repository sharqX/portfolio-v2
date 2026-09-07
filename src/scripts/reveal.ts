/**
 * Scroll-entry reveals.
 *
 * A single IntersectionObserver drives every [data-reveal] element on the
 * page — no scroll listeners. Elements are unobserved once shown so the
 * animation never re-triggers on scroll-up. Under prefers-reduced-motion
 * the whole thing no-ops and CSS keeps the content visible.
 */
export function initReveal(): void {
  const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
  if (elements.length === 0) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    elements.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
  );

  elements.forEach((el) => observer.observe(el));
}
