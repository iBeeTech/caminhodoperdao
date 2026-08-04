/**
 * Testes para formatPhoneBR
 */

import { applyPhoneInput, formatPhoneBR } from "../phone";

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
    expect(formatPhoneBR("11999999999")).toBe("(11) 99999-9999");
  });

  it("deve formatar 10 dígitos corretamente (sem 9)", () => {
    expect(formatPhoneBR("1133334444")).toBe("(11) 3333-4444");
  });

  it("deve remover caracteres não numéricos", () => {
    expect(formatPhoneBR("(11) 9999-9999")).toBe("(11) 9999-9999");
  });

  it("deve limitar a 11 dígitos", () => {
    expect(formatPhoneBR("119999999991234")).toBe("(11) 99999-9999");
  });
});

describe("applyPhoneInput", () => {
  it("apaga o dígito quando o backspace come só o parêntese da máscara", () => {
    // "(16)" com backspace vira "(16": os dígitos não mudaram, então quem sai
    // é o 6 — senão a máscara devolve o ")" e o campo parece travado.
    expect(applyPhoneInput("(16", "16").digits).toBe("1");
  });

  it("apaga normalmente quando o que saiu foi um dígito", () => {
    // O 2 final saiu no backspace: os dígitos mudaram, então é exclusão comum.
    expect(applyPhoneInput("(16) 982", "169822").digits).toBe("16982");
  });

  it("aceita dígito novo sem comer nada", () => {
    expect(applyPhoneInput("(16) 98", "1698").digits).toBe("1698");
  });

  it("tira o +55 colado e avisa", () => {
    const result = applyPhoneInput("5516982221415", "");
    expect(result.digits).toBe("16982221415");
    expect(result.hadCountryCode).toBe(true);
  });
});
