/**
 * Função genérica de rastreamento que aplica sanitização e timestamp
 */

import { trackWithClient } from "./amplitudeClient";
import { sanitizeProps } from "./sanitizer";
import type { BaseEventProps, EventNameType } from "./events";

export const track = async (
  eventName: EventNameType,
  props: BaseEventProps
): Promise<void> => {
  const safeProps = sanitizeProps({ ...props, timestamp_ms: Date.now() });
  await trackWithClient(eventName, safeProps);
};
