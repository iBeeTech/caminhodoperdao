import React from "react";
import { useTranslation } from "react-i18next";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";
import { useCountdown } from "../../../hooks/useCountdown";
import {
  BlockingCalloutWrapper,
  CalloutContent,
  CountdownWrapper,
  CountdownUnit,
  CountdownValue,
  CountdownLabel,
} from "./EnrollmentCallout.styles";

// Abertura das inscrições: 02/06/2026 às 07:00 (horário de Brasília, UTC-3)
const ENROLLMENT_OPENS_AT = "2026-06-02T10:00:00Z";

const pad = (value: number): string => String(value).padStart(2, "0");

const EnrollmentCallout: React.FC = () => {
  const { t } = useTranslation("landing");
  const { isEnabled, loading } = useFeatureFlags("enrollment");
  const countdown = useCountdown(ENROLLMENT_OPENS_AT);

  // Only show the blocking callout when enrollment is disabled
  if (loading || isEnabled === null || isEnabled) {
    return null;
  }

  const units = [
    { value: countdown.days, label: t("enrollmentCallout.units.days") },
    { value: countdown.hours, label: t("enrollmentCallout.units.hours") },
    { value: countdown.minutes, label: t("enrollmentCallout.units.minutes") },
    { value: countdown.seconds, label: t("enrollmentCallout.units.seconds") },
  ];

  return (
    <BlockingCalloutWrapper>
      <CalloutContent>
        <div>
          <strong>{t("enrollmentCallout.title")}</strong>
          <br />
          {countdown.finished
            ? t("enrollmentCallout.opening")
            : t("enrollmentCallout.message")}
        </div>

        {!countdown.finished && (
          <CountdownWrapper aria-label={t("enrollmentCallout.message")}>
            {units.map((unit) => (
              <CountdownUnit key={unit.label}>
                <CountdownValue>{pad(unit.value)}</CountdownValue>
                <CountdownLabel>{unit.label}</CountdownLabel>
              </CountdownUnit>
            ))}
          </CountdownWrapper>
        )}
      </CalloutContent>
    </BlockingCalloutWrapper>
  );
};

export default EnrollmentCallout;
