import React from "react";
import { useSectionView } from "../../hooks/useSectionView";
import type { AmplitudeEventProperties } from "../../utils/analytics/amplitudeEvents";

interface TrackSectionProps extends React.HTMLAttributes<HTMLElement> {
  pageName: string;
  sectionId: string;
  sectionName: string;
  position?: string;
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
  eventType?: "section" | "form_section";
  additionalProps?: Partial<AmplitudeEventProperties>;
}

const TrackSection: React.FC<TrackSectionProps> = ({
  pageName,
  sectionId,
  sectionName,
  position,
  threshold,
  as = "div",
  eventType = "section",
  additionalProps,
  children,
  ...rest
}) => {
  const ref = useSectionView({ pageName, sectionId, sectionName, position, threshold, eventType, additionalProps });
  const Component = as as keyof JSX.IntrinsicElements;

  return (
    <Component ref={ref as React.Ref<any>} {...rest}>
      {children}
    </Component>
  );
};

export default TrackSection;
