import { applyMaskedInput } from "./mask";

/**
 * Formatação de CEP brasileiro
 * 
 * Converte "12345678" para "12.345-678"
 */

export const CEP_DIGITS = 8;

export function formatCepBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  
  const match = digits.match(/(\d{0,2})(\d{0,3})(\d{0,3})/);
  if (!match) return "";
  
  const [, p1, p2, p3] = match;
  let out = "";
  
  if (p1) out += p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `-${p3}`;
  
  return out;
}

/** O que gravar quando a pessoa digita ou apaga no campo de CEP. */
export function applyCepInput(rawInput: string, currentDigits: string): string {
  return applyMaskedInput(rawInput, currentDigits, formatCepBR, CEP_DIGITS);
}

export default formatCepBR;
