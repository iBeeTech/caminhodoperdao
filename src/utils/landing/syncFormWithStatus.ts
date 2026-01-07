/**
 * Sincronizar dados de status com refs de formulário
 */

import { formatPhoneBR } from "../formatters/phone";
import { formatCepBR } from "../formatters/cep";
import type { FieldRefsType, RegistrationStatusResponse } from "./types";

/**
 * Mapeia dados de resposta do backend para os refs do formulário
 */
export function syncFormWithStatus(
  data: RegistrationStatusResponse,
  refs: FieldRefsType
): void {
  const assign = (ref: FieldRefsType[keyof FieldRefsType], value?: string | null) => {
    const element = ref.current as HTMLInputElement | HTMLSelectElement | null;
    if (element) {
      element.value = value ?? "";
    }
  };

  assign(refs.name, data.name ?? "");
  assign(refs.email, data.email ?? "");
  assign(refs.phone, data.phone ? formatPhoneBR(data.phone) : "");
  assign(refs.cep, data.cep ? formatCepBR(data.cep) : "");
  assign(refs.address, data.address ?? "");
  assign(refs.number, data.number ?? "");
  assign(refs.complement, data.complement ?? "");
  assign(refs.city, data.city ?? "");
  assign(refs.state, data.state ?? "");

  if (refs.sleepAtMonastery.current) {
    refs.sleepAtMonastery.current.value =
      data.sleep_at_monastery === 1 ? "yes" : data.sleep_at_monastery === 0 ? "no" : "";
  }
}

export default syncFormWithStatus;
