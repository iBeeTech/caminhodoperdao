import React from "react";
import { CalloutWrapper } from "./Callout.styles";

export type CalloutVariant = "warning" | "info" | "success" | "error";

interface CalloutProps {
  variant?: CalloutVariant;
  children: React.ReactNode;
}

const Callout: React.FC<CalloutProps> = ({ variant = "info", children }) => {
  return <CalloutWrapper $variant={variant}>{children}</CalloutWrapper>;
};

export default Callout;
