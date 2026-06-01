const DEFAULT_MAX_REGISTRATIONS = 500;
const DEFAULT_MAX_REGISTRATIONS_SLEEP = 80;
const DEFAULT_MAX_REGISTRATIONS_STAFF = 40;

export interface CapacityEnv {
  // Teto global de inscritos (staff + peregrinos, dormindo no mosteiro ou não).
  MAX_REGISTRATIONS?: string;
  // Teto de quem dorme no mosteiro (staff + não-staff juntos, por ordem de chegada).
  MAX_REGISTRATIONS_SLEEP?: string;
  // Teto de staff (dormindo no mosteiro ou não). Vagas reservadas dentro do total.
  MAX_REGISTRATIONS_STAFF?: string;
  // Legacy names kept for backward compatibility.
  MAX_REGISTRATIONS_WITHOUT_SLEEP?: string;
  MAX_REGISTRATIONS_WITH_SLEEP?: string;
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

// Deriva o teto global a partir das variáveis antigas: soma dos dois baldes
// (sem dormir + dormir) ou, em último caso, o MAX_TOTAL legado.
function deriveLegacyTotal(env: CapacityEnv): number | null {
  const withoutSleep = parseNonNegativeInteger(env.MAX_REGISTRATIONS_WITHOUT_SLEEP);
  const withSleep =
    parseNonNegativeInteger(env.MAX_REGISTRATIONS_WITH_SLEEP) ??
    parseNonNegativeInteger(env.MAX_SLEEP);
  if (withoutSleep !== null && withSleep !== null) {
    return withoutSleep + withSleep;
  }
  return parseNonNegativeInteger(env.MAX_TOTAL);
}

export function getCapacityLimits(env: CapacityEnv) {
  const maxRegistrations =
    parseNonNegativeInteger(env.MAX_REGISTRATIONS) ??
    deriveLegacyTotal(env) ??
    DEFAULT_MAX_REGISTRATIONS;

  const maxRegistrationsSleep =
    parseNonNegativeInteger(env.MAX_REGISTRATIONS_SLEEP) ??
    parseNonNegativeInteger(env.MAX_REGISTRATIONS_WITH_SLEEP) ??
    parseNonNegativeInteger(env.MAX_SLEEP) ??
    DEFAULT_MAX_REGISTRATIONS_SLEEP;

  const maxRegistrationsStaff =
    parseNonNegativeInteger(env.MAX_REGISTRATIONS_STAFF) ??
    DEFAULT_MAX_REGISTRATIONS_STAFF;

  // Vagas de staff são reservadas dentro do teto global: os peregrinos (não-staff)
  // disputam o que sobra (maxRegistrations - maxRegistrationsStaff).
  const maxRegistrationsNonStaff = Math.max(0, maxRegistrations - maxRegistrationsStaff);

  return {
    maxRegistrations,
    maxRegistrationsSleep,
    maxRegistrationsStaff,
    maxRegistrationsNonStaff,
  };
}
