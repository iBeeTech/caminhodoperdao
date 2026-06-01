/**
 * Testes para validações da Landing
 */

import { validateCheckForm, validateRegistrationForm } from "../../../../src/utils/landing/validation";
import type { FieldRefsType } from "../../../../src/utils/landing/types";
import React from "react";

// CPF válido (dígitos verificadores corretos) usado nos casos de sucesso.
const VALID_CPF = "52998224725";

// Mock de refs de input/select (campos com `value`).
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

// Mock de refs de checkbox/radio (campos com `checked`).
const createMockCheckRef = (checked: boolean): React.RefObject<HTMLInputElement> => ({
  current: {
    checked,
    focus: jest.fn(),
  } as any,
});

const mockT = (key: string) => {
  const messages: Record<string, string> = {
    "signup.errors.required": "Campo obrigatório",
    "signup.errors.emailInvalid": "Email inválido",
    "signup.errors.cpfInvalid": "CPF inválido",
    "signup.errors.dateOfBirthInvalid": "Data inválida",
    "signup.errors.phoneInvalid": "Telefone inválido",
    "signup.errors.cepInvalid": "CEP inválido",
    "signup.errors.sleepRequired": "Selecione dormitório",
    "signup.errors.sleepFull": "Dormitório lotado",
    "signup.errors.emergencyContactNameRequired": "Informe o contato de emergência",
    "signup.errors.emergencyContactPhoneInvalid": "Telefone de emergência inválido",
    "signup.errors.emergencyContactPhoneSameAsRegistration": "Telefone de emergência igual ao seu",
    "signup.errors.termsRequired": "Aceite os termos",
    "signup.errors.allergyMedicationRequired": "Informe se tem alergia",
    "signup.errors.dietaryRestrictionRequired": "Informe restrição alimentar",
  };
  return messages[key] || key;
};

describe("validateCheckForm", () => {
  it("deve retornar válido quando o CPF é válido", () => {
    const result = validateCheckForm(mockT, {
      cpf: createMockRef(VALID_CPF),
    });

    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("deve retornar erro quando o CPF está vazio", () => {
    const result = validateCheckForm(mockT, {
      cpf: createMockRef(""),
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.cpf).toBe("Campo obrigatório");
  });

  it("deve retornar erro quando o CPF é inválido", () => {
    const result = validateCheckForm(mockT, {
      cpf: createMockRef("12345678900"),
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.cpf).toBe("CPF inválido");
  });
});

describe("validateRegistrationForm", () => {
  const createFullRefs = (overrides: Partial<Record<string, string>> = {}) => {
    const defaults: Record<string, string> = {
      name: "João Silva",
      email: "joao@example.com",
      cpf: VALID_CPF,
      dateOfBirth: "1990-01-01",
      phone: "11999999999",
      cep: "12345678",
      address: "Rua Teste",
      number: "123",
      complement: "Apt 1",
      city: "São Paulo",
      state: "SP",
      sleepAtMonastery: "yes",
      emergencyContactName: "Maria Silva",
      emergencyContactPhone: "11888888888",
    };

    const values = { ...defaults, ...overrides };

    return {
      name: createMockRef(values.name),
      email: createMockRef(values.email),
      cpf: createMockRef(values.cpf),
      dateOfBirth: createMockRef(values.dateOfBirth),
      phone: createMockRef(values.phone),
      cep: createMockRef(values.cep),
      address: createMockRef(values.address),
      number: createMockRef(values.number),
      complement: createMockRef(values.complement),
      city: createMockRef(values.city),
      state: createMockRef(values.state),
      sleepAtMonastery: createMockSelectRef(values.sleepAtMonastery),
      emergencyContactName: createMockRef(values.emergencyContactName),
      emergencyContactPhone: createMockRef(values.emergencyContactPhone),
      // Campos obrigatórios de marcação: termos aceitos e "não" para alergia/dieta.
      termsAccepted: createMockCheckRef(true),
      allergyMedicationYes: createMockCheckRef(false),
      allergyMedicationNo: createMockCheckRef(true),
      dietaryRestrictionYes: createMockCheckRef(false),
      dietaryRestrictionNo: createMockCheckRef(true),
    } as unknown as FieldRefsType;
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

  it("deve retornar erro para CPF inválido", () => {
    const result = validateRegistrationForm(mockT, createFullRefs({ cpf: "12345678900" }));

    expect(result.isValid).toBe(false);
    expect(result.errors.cpf).toBe("CPF inválido");
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
