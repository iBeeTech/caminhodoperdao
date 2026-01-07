/**
 * Utilitários para manipulação de elementos DOM (forms)
 */

import type { FieldRefsType } from "../landing/types";

/**
 * Extrai valor de um input, removendo espaços nas extremidades
 */
export function getFieldValue(input: HTMLInputElement | HTMLSelectElement | null): string {
  return input?.value.trim() ?? "";
}

/**
 * Foca no primeiro campo com erro encontrado
 * 
 * @param errorMap - Mapa de erros { fieldName: "mensagem de erro" }
 * @param fieldRefs - Objeto com referências aos campos
 */
export function focusFirstError(errorMap: Record<string, string>, fieldRefs: Partial<FieldRefsType>): void {
  const firstKey = Object.keys(errorMap).find((key) => fieldRefs[key as keyof FieldRefsType]);
  if (!firstKey) return;

  const element = fieldRefs[firstKey as keyof FieldRefsType]?.current;
  if (element) {
    element.focus();
  }
}

export default { getFieldValue, focusFirstError };
