/**
 * Formatação de telefone brasileiro
 * 
 * Converte "11999999999" para "(11)9 9999-9999"
 */

export function formatPhoneBR(digits: string): string {
  const sanitized = digits.replace(/\D/g, "").slice(0, 11);
  if (!sanitized) return "";

  if (sanitized.length <= 2) {
    return `(${sanitized}${sanitized.length === 2 ? ")" : ""}`;
  }

  const ddd = sanitized.slice(0, 2);
  const body = sanitized.slice(2);
  const first = body.slice(0, 1);
  const rest = body.slice(1);

  let out = `(${ddd})`;
  if (first) out += ` ${first}`;

  if (rest.length <= 4) {
    out += rest;
  } else {
    out += `${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  }

  return out;
}

export default formatPhoneBR;
