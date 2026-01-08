/**
 * Listener para elementos com data-analytics-*
 * data-analytics-type="interaction|noninteraction"
 * data-analytics-category="..."
 * data-analytics-action="..."
 * data-analytics-label="..."
 */

import { trackInteraction, trackNonInteraction } from "./trackers";
import { sanitizeText } from "./sanitizer";

export const attachDataAttributesListener = (): (() => void) | void => {
  if (typeof window === "undefined") return;

  const handler = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const dataset = (target as HTMLElement).dataset;
    const type = dataset.analyticsType;
    if (!type) return;

    const category = dataset.analyticsCategory || "app";
    const action = dataset.analyticsAction || (type === "interaction" ? "click" : "impression");
    const label = dataset.analyticsLabel || target.id || target.getAttribute("aria-label") || target.getAttribute("name") || "unknown";
    const pageName = dataset.analyticsPage || inferPageName();
    const screenName = window.location.pathname;
    const elementText = sanitizeText(dataset.analyticsText || target.textContent || undefined);
    const href = (target as HTMLAnchorElement).href;

    if (type === "noninteraction") {
      trackNonInteraction({
        pageName,
        screenName,
        category,
        action,
        label,
      });
      return;
    }

    trackInteraction({
      pageName,
      screenName,
      category,
      action,
      label,
      elementText,
      href,
    });
  };

  document.addEventListener("click", handler, true);

  return () => document.removeEventListener("click", handler, true);
};

const inferPageName = (): string => {
  if (typeof window === "undefined") return "unknown";
  const pathname = window.location.pathname;
  if (pathname === "/" || pathname === "") return "landing";
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] || "unknown";
};
