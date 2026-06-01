/**
 * Cobertura do guard de SSR (window indefinido) de getPageContext.
 *
 * Roda no ambiente node — onde `window` é genuinamente undefined — porque o
 * jsdom 30 expõe `window` como getter não-configurável do global, impossível de
 * remover em tempo de teste.
 *
 * @jest-environment node
 */

import { getPageContext } from "../../../../src/utils/analytics/amplitudeContext";

describe("getPageContext (SSR / window undefined)", () => {
  it("deve retornar objeto vazio quando window é undefined", () => {
    expect(typeof window).toBe("undefined");
    expect(getPageContext("landing")).toEqual({});
  });
});
