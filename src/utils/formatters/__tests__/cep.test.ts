/**
 * Testes para formatCepBR
 */

import { formatCepBR } from "../cep";

describe("formatCepBR", () => {
  it("deve retornar string vazia para entrada vazia", () => {
    expect(formatCepBR("")).toBe("");
  });

  it("deve formatar 2 dígitos como XX", () => {
    expect(formatCepBR("12")).toBe("12");
  });

  it("deve formatar 5 dígitos como XX.XXX", () => {
    expect(formatCepBR("12345")).toBe("12.345");
  });

  it("deve formatar 8 dígitos como XX.XXX-XXX", () => {
    expect(formatCepBR("12345678")).toBe("12.345-678");
  });

  it("deve remover caracteres não numéricos", () => {
    expect(formatCepBR("12.345-678")).toBe("12.345-678");
  });

  it("deve limitar a 8 dígitos", () => {
    expect(formatCepBR("123456789123")).toBe("12.345-678");
  });

  it("deve formatar parcialmente durante digitação", () => {
    expect(formatCepBR("123")).toBe("12.3");
  });
});
