import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrackedButton from "../TrackedButton";

const ctaClickedMock = jest.fn();

jest.mock("../../../hooks/useAnalytics", () => ({
  useAnalytics: () => ({
    ctaClicked: ctaClickedMock,
  }),
}));

describe("TrackedButton", () => {
  beforeEach(() => {
    ctaClickedMock.mockClear();
  });

  it("rastreia clique com propriedades padronizadas", async () => {
    render(
      <TrackedButton
        pageName="landing"
        ctaId="hero_primary"
        sectionId="hero"
        sectionName="hero"
        position="top"
        destination="registration"
      >
        Comecar
      </TrackedButton>
    );

    await userEvent.click(screen.getByRole("button", { name: /comecar/i }));

    expect(ctaClickedMock).toHaveBeenCalledTimes(1);
    expect(ctaClickedMock).toHaveBeenCalledWith(
      "landing",
      "hero_primary",
      "Comecar",
      "registration",
      expect.objectContaining({
        section_id: "hero",
        section_name: "hero",
        position: "top",
      })
    );
  });
});
