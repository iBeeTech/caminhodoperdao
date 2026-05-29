import React from "react";
import { useTranslation } from "react-i18next";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";
import { BlockingCalloutWrapper, CalloutContent } from "./EnrollmentCallout.styles";

const EnrollmentCallout: React.FC = () => {
  const { t } = useTranslation("landing");
  const { isEnabled, loading } = useFeatureFlags("enrollment");

  // Only show the blocking callout when enrollment is disabled
  if (loading || isEnabled === null || isEnabled) {
    return null;
  }

  return (
    <BlockingCalloutWrapper>
      <CalloutContent>
        <div>
          <strong>{t("enrollmentCallout.title")}</strong>
          <br />
          {t("enrollmentCallout.message")}
        </div>
      </CalloutContent>
    </BlockingCalloutWrapper>
  );
};

export default EnrollmentCallout;
