/**
 * Testes para validação de email
 */

import { isEmailValid, emailRegex } from "../../../../src/utils/validators/email";

describe("isEmailValid", () => {
  it("deve retornar true para email válido", () => {
    expect(isEmailValid("user@example.com")).toBe(true);
  });

  it("deve retornar true para email com ponto no nome", () => {
    expect(isEmailValid("user.name@example.com")).toBe(true);
  });

  it("deve retornar true para email com números", () => {
    expect(isEmailValid("user123@example.com")).toBe(true);
  });

  it("deve retornar false para email sem @", () => {
    expect(isEmailValid("userexample.com")).toBe(false);
  });

  it("deve retornar false para email sem domínio", () => {
    expect(isEmailValid("user@")).toBe(false);
  });

  it("deve retornar false para email sem extensão", () => {
    expect(isEmailValid("user@example")).toBe(false);
  });

  it("deve retornar false para email vazio", () => {
    expect(isEmailValid("")).toBe(false);
  });

  it("deve retornar false para email com espaços", () => {
    expect(isEmailValid("user @example.com")).toBe(false);
  });
});

describe("emailRegex", () => {
  it("deve estar definido", () => {
    expect(emailRegex).toBeDefined();
  });

  it("deve testar validamente emails", () => {
    expect(emailRegex.test("valid@example.com")).toBe(true);
    expect(emailRegex.test("invalid@")).toBe(false);
  });
});
