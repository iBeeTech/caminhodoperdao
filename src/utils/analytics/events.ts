/**
 * Eventos padronizados (GA4-like) para Amplitude
 * Event name SEMPRE é um destes: screen_view, noninteraction, interaction
 */

export const EventName = {
  SCREEN_VIEW: "screen_view",
  NONINTERACTION: "noninteraction",
  INTERACTION: "interaction",
} as const;

export type EventNameType = typeof EventName[keyof typeof EventName];

export interface BaseEventProps {
  event_category: string;
  event_action: string;
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

export interface ScreenViewProps extends BaseEventProps {
  event_action: "screen_view";
}

export interface NonInteractionProps extends BaseEventProps {
  event_action: string;
}

export interface InteractionProps extends BaseEventProps {
  event_action: string;
}
