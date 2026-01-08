/**
 * Helpers de alto nível para rastreamento (GA4-like)
 * Mapeia eventos genéricos para os event names definidos no tracking plan
 */

import { track } from "./track";
import { amplitudeEventNames } from "./amplitudeClient";
import type { BaseEventProps } from "./events";

export const trackScreenView = async ({
  pageName,
  screenName,
  category,
  action = "page_viewed",
}: {
  pageName: string;
  screenName?: string;
  category?: string;
  action?: string;
}): Promise<void> => {
  console.log("[Analytics] trackScreenView called with:", { pageName, screenName, category });
  const props: BaseEventProps = {
    page_name: pageName,
  };

  console.log("[Analytics] trackScreenView sending props:", props);
  await track(amplitudeEventNames.PAGE_VIEWED, props);
};

export const trackNonInteraction = async ({
  pageName,
  screenName,
  category,
  action,
  label,
  sectionId,
  sectionName,
  extra,
}: {
  pageName: string;
  screenName?: string;
  category: string;
  action: string;
  label?: string;
  sectionId?: string;
  sectionName?: string;
  extra?: Record<string, any>;
}): Promise<void> => {
  // Map to appropriate event based on category/action
  let eventName: string = amplitudeEventNames.SECTION_VIEWED;

  if (action === "section_view" && sectionId && sectionName) {
    eventName = amplitudeEventNames.SECTION_VIEWED;
  }

  const props: BaseEventProps = {
    page_name: pageName,
    section_id: sectionId,
    section_name: sectionName,
    ...extra,
  };

  await track(eventName, props);
};

export const trackInteraction = async ({
  pageName,
  screenName,
  category,
  action,
  label,
  elementText,
  href,
  extra,
}: {
  pageName: string;
  screenName?: string;
  category: string;
  action: string;
  label: string;
  elementText?: string;
  href?: string;
  extra?: Record<string, any>;
}): Promise<void> => {
  let eventName = amplitudeEventNames.CTA_CLICKED;
  const props: BaseEventProps = {
    page_name: pageName,
  };

  // Map generic action names to specific event names
  if (action === "click_link") {
    eventName = amplitudeEventNames.NAVIGATION_LINK_CLICKED;
    props.link_text = label;
    props.href = href;
  } else if (action === "click_button") {
    eventName = amplitudeEventNames.CTA_CLICKED;
    props.cta_id = label;
    if (extra?.cta_text) props.cta_text = extra.cta_text;
    if (extra?.destination) props.destination = extra.destination;
  }

  // Add any additional properties from extra
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      if (key !== "cta_text" && key !== "destination" && !props[key]) {
        props[key] = value;
      }
    });
  }

  await track(eventName, props);
};
