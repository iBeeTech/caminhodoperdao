import React from "react";
import { CalloutWrapper } from "./Callout.styles";

export type CalloutVariant = "warning" | "info" | "success" | "error";

interface CalloutProps {
  variant?: CalloutVariant;
  children: React.ReactNode;
}

const Callout: React.FC<CalloutProps> = ({ variant = "info", children }) => {
  const role = variant === "error" || variant === "warning" ? "alert" : "status";
  const ariaLive = variant === "error" ? "assertive" : "polite";

  return (
    <CalloutWrapper $variant={variant} role={role} aria-live={ariaLive}>
      {children}
    </CalloutWrapper>
  );
};

export default Callout;
