import { httpClient } from "../http/client";
import {
  AvailabilityResponse,
  MonasteryUpgradeResponse,
  RegistrationPayload,
  RegistrationResponse,
  RegistrationStatusResponse,
  TshirtConfigResponse,
  TshirtPurchasePayload,
  TshirtPurchaseResponse,
  TshirtStatusResponse,
} from "./landing.types";

export const landingService = {
  async getAvailability(): Promise<AvailabilityResponse> {
    return httpClient.get<AvailabilityResponse>("/api/availability");
  },

  async checkStatus(cpf: string, name?: string): Promise<RegistrationStatusResponse> {
    let url = `/api/status?cpf=${encodeURIComponent(cpf)}`;
    if (name) {
      url += `&name=${encodeURIComponent(name)}`;
    }
    return httpClient.get<RegistrationStatusResponse>(url);
  },

  async cancelRegistration(cpf: string): Promise<{ status?: string; refund?: boolean }> {
    // POST (não DELETE): corpo em DELETE é descartado por alguns proxies.
    return httpClient.post<{ status?: string; refund?: boolean }>("/api/registration/cancel", {
      cpf,
    });
  },

  async register(payload: RegistrationPayload): Promise<RegistrationResponse> {
    return httpClient.post<RegistrationResponse>("/api/register", payload);
  },

  // Troca a modalidade da inscrição. target "monastery" (geral->pernoite) ou "general"
  // (pernoite->geral). Pendente reemite o PIX; pago paga diferença (upgrade) ou faz
  // downgrade na hora + estorno. Exige vaga no mosteiro no caso de upgrade.
  async changeLodging(
    cpf: string,
    target: "monastery" | "general"
  ): Promise<MonasteryUpgradeResponse> {
    return httpClient.post<MonasteryUpgradeResponse>("/api/upgrade-monastery", { cpf, target });
  },

  // Cancela UMA compra de camiseta (pendente ou paga). Paga gera estorno.
  async cancelTshirt(cpf: string, purchaseId: string): Promise<{ status?: string; refund?: boolean }> {
    return httpClient.post<{ status?: string; refund?: boolean }>("/api/tshirt/cancel", {
      cpf,
      purchaseId,
    });
  },

  async getTshirtConfig(): Promise<TshirtConfigResponse> {
    return httpClient.get<TshirtConfigResponse>("/api/tshirt");
  },

  async purchaseTshirt(payload: TshirtPurchasePayload): Promise<TshirtPurchaseResponse> {
    return httpClient.post<TshirtPurchaseResponse>("/api/tshirt", payload);
  },

  async checkTshirtStatus(cpf: string, name: string): Promise<TshirtStatusResponse> {
    const url = `/api/tshirt?cpf=${encodeURIComponent(cpf)}&name=${encodeURIComponent(name)}`;
    return httpClient.get<TshirtStatusResponse>(url);
  },
};
