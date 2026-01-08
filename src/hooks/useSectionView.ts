import { useEffect, useRef } from "react";
import type { AmplitudeEventProperties } from "../utils/analytics/amplitudeEvents";
import { useAnalytics } from "./useAnalytics";

type UseSectionViewOptions = {
  pageName?: string;
  sectionId: string;
  sectionName: string;
  position?: string;
  threshold?: number;
  enableSessionDedup?: boolean;
  eventType?: "section" | "form_section";
  additionalProps?: Partial<AmplitudeEventProperties>;
};

const seenInMemory = new Set<string>();
const SESSION_KEY = "section_viewed_once";

const loadSessionSet = (): Set<string> => {
  if (typeof window === "undefined" || !window.sessionStorage) return new Set<string>();
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set<string>(parsed as string[]);
  } catch (error) {
    console.warn("[useSectionView] Failed to read sessionStorage", error);
  }
  return new Set<string>();
};

const persistSessionSet = (set: Set<string>): void => {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(set)));
  } catch (error) {
    console.warn("[useSectionView] Failed to write sessionStorage", error);
  }
};

const getDedupKey = (pageName: string, sectionId: string): string => `${pageName}::${sectionId}`;

export const useSectionView = ({
  pageName,
  sectionId,
  sectionName,
  position,
  threshold = 0.25,
  enableSessionDedup = true,
  eventType = "section",
  additionalProps,
}: UseSectionViewOptions) => {
  const { sectionViewed, formSectionViewed } = useAnalytics();
  const elementRef = useRef<HTMLElement | null>(null);
  const sessionSetRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) {
      console.warn("[useSectionView] IntersectionObserver not supported");
      return;
    }

    const target = elementRef.current;
    if (!target) return;

    const resolvedPageName = pageName || inferPageNameFromRoute();
    if (!sessionSetRef.current) {
      sessionSetRef.current = loadSessionSet();
    }

    const dedupKey = getDedupKey(resolvedPageName, sectionId);
    const alreadyTracked = seenInMemory.has(dedupKey) || (enableSessionDedup && sessionSetRef.current.has(dedupKey));
    if (alreadyTracked) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (seenInMemory.has(dedupKey)) return;

          const route = typeof window !== "undefined" ? window.location.pathname : undefined;
          const track = eventType === "form_section" ? formSectionViewed : sectionViewed;

          track(resolvedPageName, sectionId, sectionName, position, { route, ...additionalProps });

          seenInMemory.add(dedupKey);
          if (enableSessionDedup && sessionSetRef.current) {
            sessionSetRef.current.add(dedupKey);
            persistSessionSet(sessionSetRef.current);
          }

          observer.unobserve(entry.target);
        });
      },
      { threshold }
    );

    observer.observe(target);
    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [pageName, position, sectionId, sectionName, threshold, enableSessionDedup, sectionViewed, formSectionViewed, eventType, additionalProps]);

  return elementRef;
};

const inferPageNameFromRoute = (): string => {
  if (typeof window === "undefined") return "unknown";
  const pathname = window.location.pathname;
  if (pathname === "/" || pathname === "") return "landing";
  if (pathname.startsWith("/gallery")) return "gallery";
  if (pathname.startsWith("/about")) return "about";
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] || "unknown";
};
