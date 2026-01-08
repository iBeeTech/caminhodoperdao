/**
 * Sanitização LGPD-safe para textos e propriedades de eventos
 */

const EMAIL_REGEX = /[\w.!#$%&'*+/=?`{|}~-]+@[^\s@]+\.[^\s@]+/g;
const PROHIBITED_KEYS = [
  "email",
  "cpf",
  "cnpj",
  "phone",
  "telephone",
  "mobile",
  "cellphone",
  "name",
  "full_name",
  "fullName",
  "address",
  "number",
  "complement",
  "city",
  "state",
  "cep",
  "zip",
  "token",
  "access_token",
  "refresh_token",
];

export const sanitizeText = (value?: string | null, maxLen = 120): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim().replace(EMAIL_REGEX, "[redacted_email]");
  return trimmed.slice(0, maxLen);
};

export const sanitizeProps = (props?: Record<string, any>): Record<string, any> => {
  if (!props) return {};
  const cleaned: Record<string, any> = {};

  Object.entries(props).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (PROHIBITED_KEYS.some(p => key.toLowerCase().includes(p))) return;

    if (typeof value === "string") {
      const sanitized = sanitizeText(value);
      if (sanitized !== undefined) cleaned[key] = sanitized;
    } else {
      cleaned[key] = value;
    }
  });

  return cleaned;
};
