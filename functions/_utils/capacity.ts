const DEFAULT_MAX_REGISTRATIONS_WITHOUT_SLEEP = 430;
const DEFAULT_MAX_REGISTRATIONS_WITH_SLEEP = 70;

export interface CapacityEnv {
  MAX_REGISTRATIONS_WITHOUT_SLEEP?: string;
  MAX_REGISTRATIONS_WITH_SLEEP?: string;
  // Legacy names kept for backward compatibility.
  MAX_TOTAL?: string;
  MAX_SLEEP?: string;
}

function parseNonNegativeInteger(rawValue: string | undefined): number | null {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.trunc(parsed);
}

function deriveLegacyWithoutSleepLimit(rawTotal: string | undefined, maxWithSleep: number): number | null {
  const parsedTotal = parseNonNegativeInteger(rawTotal);
  if (parsedTotal === null) {
    return null;
  }
  return Math.max(0, parsedTotal - maxWithSleep);
}

export function getCapacityLimits(env: CapacityEnv) {
  const maxRegistrationsWithSleep =
    parseNonNegativeInteger(env.MAX_REGISTRATIONS_WITH_SLEEP) ??
    parseNonNegativeInteger(env.MAX_SLEEP) ??
    DEFAULT_MAX_REGISTRATIONS_WITH_SLEEP;

  const maxRegistrationsWithoutSleep =
    parseNonNegativeInteger(env.MAX_REGISTRATIONS_WITHOUT_SLEEP) ??
    deriveLegacyWithoutSleepLimit(env.MAX_TOTAL, maxRegistrationsWithSleep) ??
    DEFAULT_MAX_REGISTRATIONS_WITHOUT_SLEEP;

  return {
    maxRegistrationsWithoutSleep,
    maxRegistrationsWithSleep,
    maxRegistrationsOverall: maxRegistrationsWithoutSleep + maxRegistrationsWithSleep,
  };
}
