/**
 * Testes para validações da Landing
 */

import { validateCheckForm, validateRegistrationForm } from "../../../../src/utils/landing/validation";
import type { FieldRefsType } from "../../../../src/utils/landing/types";
import React from "react";

// Mock de refs
const createMockRef = (value: string): React.RefObject<HTMLInputElement> => ({
  current: {
    value,
    focus: jest.fn(),
  } as any,
});

const createMockSelectRef = (value: string): React.RefObject<HTMLSelectElement> => ({
  current: {
    value,
    focus: jest.fn(),
  } as any,
});

const mockT = (key: string) => {
  const messages: Record<string, string> = {
    "signup.errors.required": "Campo obrigatório",
    "signup.errors.emailInvalid": "Email inválido",
    "signup.errors.phoneInvalid": "Telefone inválido",
    "signup.errors.cepInvalid": "CEP inválido",
    "signup.errors.sleepRequired": "Selecione dormitório",
    "signup.errors.sleepFull": "Dormitório lotado",
  };
  return messages[key] || key;
};

describe("validateCheckForm", () => {
  it("deve retornar válido quando preenchido corretamente", () => {
    const result = validateCheckForm(mockT, {
      name: createMockRef("João Silva"),
      email: createMockRef("joao@example.com"),
    });

    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("deve retornar erro quando nome vazio", () => {
    const result = validateCheckForm(mockT, {
      name: createMockRef(""),
      email: createMockRef("joao@example.com"),
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe("Campo obrigatório");
  });

  it("deve retornar erro quando email vazio", () => {
    const result = validateCheckForm(mockT, {
      name: createMockRef("João"),
      email: createMockRef(""),
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe("Campo obrigatório");
  });

  it("deve retornar erro quando email inválido", () => {
    const result = validateCheckForm(mockT, {
      name: createMockRef("João"),
      email: createMockRef("email-invalido"),
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe("Email inválido");
  });
});

describe("validateRegistrationForm", () => {
  const createFullRefs = (overrides: Partial<Record<keyof FieldRefsType, string>> = {}) => {
    const defaults: Record<keyof FieldRefsType, string> = {
      name: "João Silva",
      email: "joao@example.com",
      phone: "11999999999",
      cep: "12345678",
      address: "Rua Teste",
      number: "123",
      complement: "Apt 1",
      city: "São Paulo",
      state: "SP",
      sleepAtMonastery: "yes",
    };

    const values = { ...defaults, ...overrides };

    return {
      name: createMockRef(values.name),
      email: createMockRef(values.email),
      phone: createMockRef(values.phone),
      cep: createMockRef(values.cep),
      address: createMockRef(values.address),
      number: createMockRef(values.number),
      complement: createMockRef(values.complement),
      city: createMockRef(values.city),
      state: createMockRef(values.state),
      sleepAtMonastery: createMockSelectRef(values.sleepAtMonastery),
    } as FieldRefsType;
  };

  it("deve retornar válido quando preenchido corretamente", () => {
    const result = validateRegistrationForm(mockT, createFullRefs());

    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("deve retornar erro para phone inválido", () => {
    const result = validateRegistrationForm(mockT, createFullRefs({ phone: "119" }));

    expect(result.isValid).toBe(false);
    expect(result.errors.phone).toBe("Telefone inválido");
  });

  it("deve retornar erro para cep inválido", () => {
    const result = validateRegistrationForm(mockT, createFullRefs({ cep: "1234" }));

    expect(result.isValid).toBe(false);
    expect(result.errors.cep).toBe("CEP inválido");
  });

  it("deve retornar erro para sleep não selecionado", () => {
    const result = validateRegistrationForm(mockT, createFullRefs({ sleepAtMonastery: "" }));

    expect(result.isValid).toBe(false);
    expect(result.errors.sleepAtMonastery).toBe("Selecione dormitório");
  });

  it("deve retornar erro quando monastério está cheio e usuário quer dormir", () => {
    const result = validateRegistrationForm(mockT, createFullRefs(), {
      monasteryFull: true,
      alreadySleeper: false,
      isMonasterySlotUnavailable: false,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.sleepAtMonastery).toBe("Dormitório lotado");
  });

  it("deve permitir 'não' quando monastério está cheio", () => {
    const result = validateRegistrationForm(
      mockT,
      createFullRefs({ sleepAtMonastery: "no" }),
      {
        monasteryFull: true,
        alreadySleeper: false,
        isMonasterySlotUnavailable: false,
      }
    );

    expect(result.isValid).toBe(true);
  });

  it("deve retornar múltiplos erros", () => {
    const result = validateRegistrationForm(mockT, createFullRefs({
      name: "",
      phone: "119",
      cep: "123",
      sleepAtMonastery: "",
    }));

    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThan(3);
  });
});
