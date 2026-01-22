import { httpClient } from "../http/client";
import {
  AvailabilityResponse,
  RegistrationPayload,
  RegistrationResponse,
  RegistrationStatusResponse,
} from "./landing.types";

export const landingService = {
  async getAvailability(): Promise<AvailabilityResponse> {
    return httpClient.get<AvailabilityResponse>("/api/availability");
  },

  async checkStatus(email: string, name?: string): Promise<RegistrationStatusResponse> {
    let url = `/api/status?email=${encodeURIComponent(email)}`;
    if (name) {
      url += `&name=${encodeURIComponent(name)}`;
    }
    return httpClient.get<RegistrationStatusResponse>(url);
  },

  async register(payload: RegistrationPayload): Promise<RegistrationResponse> {
    return httpClient.post<RegistrationResponse>("/api/register", payload);
  },
};
