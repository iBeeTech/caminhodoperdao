import React from "react";
import Button, { type ButtonProps } from "../atoms/Button/Button";
import { useAnalytics } from "../../hooks/useAnalytics";

export interface TrackedButtonProps extends ButtonProps {
  pageName: string;
  ctaId: string;
  destination?: string;
  sectionId?: string;
  sectionName?: string;
  position?: string;
  ctaText?: string;
}

const TrackedButton: React.FC<TrackedButtonProps> = ({
  pageName,
  ctaId,
  destination,
  sectionId,
  sectionName,
  position,
  ctaText,
  children,
  onClick,
  ...buttonProps
}) => {
  const { ctaClicked } = useAnalytics();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const textFromChildren = typeof children === "string" ? children : undefined;
    ctaClicked(pageName, ctaId, ctaText || textFromChildren, destination, {
      section_id: sectionId,
      section_name: sectionName,
      position,
    });

    if (onClick) {
      onClick(event);
    }
  };

  return (
    <Button onClick={handleClick} {...buttonProps}>
      {children}
    </Button>
  );
};

export default TrackedButton;
