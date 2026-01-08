/**
 * Eventos padronizados (GA4-like) para Amplitude
 * Mapeia para os event names definidos no tracking plan
 */

import { amplitudeEventNames } from "./amplitudeClient";

export const EventName = amplitudeEventNames;

export type EventNameType = typeof EventName[keyof typeof EventName];

export interface BaseEventProps {
  event_category?: string;
  event_action?: string;
  event_label?: string;
  screen_name?: string;
  page_name?: string;
  element_text?: string;
  href?: string;
  section_id?: string;
  section_name?: string;
  timestamp_ms?: number;
  [key: string]: any;
}
