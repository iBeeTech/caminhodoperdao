import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import App from "./App";
import landingTranslations from "./i18n/locales/pt-BR/landing.json";

jest.mock("./services/landing/landing.service", () => ({
  landingService: {
    getAvailability: jest.fn().mockResolvedValue({ totalFull: false, monasteryFull: false }),
    checkStatus: jest.fn().mockResolvedValue({ exists: false }),
    register: jest.fn().mockResolvedValue({ status: "PENDING", qrCodeText: "pix" }),
  },
}));

const renderWithClient = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

test("renderiza a landing page por padrão", async () => {
  renderWithClient(<App />);
  const heroTitle = landingTranslations.hero.title;
  expect(await screen.findByText(heroTitle)).toBeInTheDocument();
});
