import { useEffect } from "react";
import { attachDataAttributesListener } from "../../utils/analytics/dataAttributes";

const AutoAnalyticsListener = () => {
  useEffect(() => {
    const cleanup = attachDataAttributesListener();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return null;
};

export default AutoAnalyticsListener;
