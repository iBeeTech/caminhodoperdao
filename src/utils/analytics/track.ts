/**
 * Função genérica de rastreamento que aplica sanitização e timestamp
 */

import { amplitudeEventNames, trackWithClient } from "./amplitudeClient";
import { sanitizeProps } from "./sanitizer";
import type { BaseEventProps, EventNameType } from "./events";

export const track = async (
  eventName: EventNameType,
  props: BaseEventProps
): Promise<void> => {
  const safeProps = sanitizeProps({ ...props, timestamp_ms: Date.now() });

  if (eventName === amplitudeEventNames.SCREEN_VIEW) {
    await trackWithClient(amplitudeEventNames.SCREEN_VIEW, safeProps);
    return;
  }

  if (eventName === amplitudeEventNames.NONINTERACTION) {
    await trackWithClient(amplitudeEventNames.NONINTERACTION, safeProps);
    return;
  }

  await trackWithClient(amplitudeEventNames.INTERACTION, safeProps);
};
