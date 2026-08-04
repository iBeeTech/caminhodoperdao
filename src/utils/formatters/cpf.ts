/**
 * Máscara de CPF: `396.249.258-52`.
 *
 * Só números entram; a pontuação é sempre reconstruída a partir dos dígitos, o
 * que faz apagar e colar funcionarem sem tratamento especial.
 */
import { applyMaskedInput } from "./mask";

export const CPF_DIGITS = 11;

export function formatCpfBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, CPF_DIGITS);
  if (!digits) return "";

  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean);
  const check = digits.slice(9);

  return check ? `${parts.join(".")}-${check}` : parts.join(".");
}

/** O que gravar quando a pessoa digita ou apaga no campo de CPF. */
export function applyCpfInput(rawInput: string, currentDigits: string): string {
  return applyMaskedInput(rawInput, currentDigits, formatCpfBR, CPF_DIGITS);
}

export default formatCpfBR;
