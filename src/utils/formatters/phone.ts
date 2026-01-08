/**
 * Formatação de telefone brasileiro com suporte a backspace
 * 
 * Converte "11999999999" para "(11)9 9999-9999"
 * Permite deletar caracteres especiais com backspace
 */

export function formatPhoneBR(input: string): string {
  // Extrair apenas dígitos
  const digits = input.replace(/\D/g, "").slice(0, 11);
  
  if (!digits) return "";

  // Formatar baseado no número de dígitos
  if (digits.length <= 2) {
    return `(${digits}${digits.length === 2 ? ")" : ""}`;
  }

  const ddd = digits.slice(0, 2);
  const body = digits.slice(2);
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
