/**
 * Helpers de alto nível para rastreamento padronizado (GA4-like)
 */

import { sanitizeText } from "./sanitizer";
import { EventName, type InteractionProps, type NonInteractionProps, type ScreenViewProps } from "./events";
import { track } from "./track";

export const trackScreenView = async ({
  pageName,
  screenName,
  category,
  action = "screen_view",
}: {
  pageName: string;
  screenName?: string;
  category?: string;
  action?: "screen_view";
}): Promise<void> => {
  const props: ScreenViewProps = {
    event_category: category || pageName,
    event_action: action,
    event_label: screenName || pageName,
    page_name: pageName,
    screen_name: screenName,
  };

  await track(EventName.SCREEN_VIEW, props);
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
  const props: NonInteractionProps = {
    event_category: category,
    event_action: action,
    event_label: label,
    page_name: pageName,
    screen_name: screenName,
    section_id: sectionId,
    section_name: sectionName,
    ...extra,
  };

  await track(EventName.NONINTERACTION, props);
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
  const props: InteractionProps = {
    event_category: category,
    event_action: action,
    event_label: label,
    page_name: pageName,
    screen_name: screenName,
    element_text: sanitizeText(elementText),
    href,
    ...extra,
  };

  await track(EventName.INTERACTION, props);
};
