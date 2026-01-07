/**
 * Testes para formatPhoneBR
 */

import { formatPhoneBR } from "../phone";

describe("formatPhoneBR", () => {
  it("deve retornar string vazia para entrada vazia", () => {
    expect(formatPhoneBR("")).toBe("");
  });

  it("deve formatar 2 dígitos como (XX)", () => {
    expect(formatPhoneBR("11")).toBe("(11)");
  });

  it("deve formatar 1 dígito como (X", () => {
    expect(formatPhoneBR("1")).toBe("(1");
  });

  it("deve formatar 11 dígitos corretamente", () => {
    expect(formatPhoneBR("11999999999")).toBe("(11) 9 9999-9999");
  });

  it("deve formatar 10 dígitos corretamente (sem 9)", () => {
    expect(formatPhoneBR("1133334444")).toBe("(11) 3333-4444");
  });

  it("deve remover caracteres não numéricos", () => {
    expect(formatPhoneBR("(11) 9999-9999")).toBe("(11) 9 9999-9999");
  });

  it("deve limitar a 11 dígitos", () => {
    expect(formatPhoneBR("119999999991234")).toBe("(11) 9 9999-9999");
  });
});
