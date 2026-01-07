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

  async checkStatus(email: string): Promise<RegistrationStatusResponse> {
    return httpClient.get<RegistrationStatusResponse>(`/api/status?email=${encodeURIComponent(email)}`);
  },

  async register(payload: RegistrationPayload): Promise<RegistrationResponse> {
    return httpClient.post<RegistrationResponse>("/api/register", payload);
  },
};
