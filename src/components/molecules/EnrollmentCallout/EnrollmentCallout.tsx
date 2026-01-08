import React from "react";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";
import { BlockingCalloutWrapper, CalloutContent } from "./EnrollmentCallout.styles";

const EnrollmentCallout: React.FC = () => {
  const { isEnabled, loading } = useFeatureFlags("enrollment");

  // Only show the blocking callout when enrollment is disabled
  if (loading || isEnabled === null || isEnabled) {
    return null;
  }

  return (
    <BlockingCalloutWrapper>
      <CalloutContent>
        <div>
          <strong>Atenção!</strong>
          <br />
          As inscrições abrirão em breve
        </div>
      </CalloutContent>
    </BlockingCalloutWrapper>
  );
};

export default EnrollmentCallout;
