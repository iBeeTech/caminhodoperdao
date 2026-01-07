/**
 * Testes para amplitudeContext
 * 
 * Valida:
 * - Remoção de PII
 * - Injeção de contexto
 * - Merge de propriedades
 * - Validação de eventos
 */

import {
  sanitizeProps,
  mergeProps,
  getPageContext,
  isProhibitedKey,
  validateEventProperties,
  prepareEventProperties,
  PROHIBITED_KEYS,
} from "../amplitudeContext";

describe("amplitudeContext", () => {
  describe("isProhibitedKey", () => {
    it("deve detectar chaves de email", () => {
      expect(isProhibitedKey("email")).toBe(true);
      expect(isProhibitedKey("user_email")).toBe(true);
      expect(isProhibitedKey("EMAIL")).toBe(true);
    });

    it("deve detectar chaves de telefone", () => {
      expect(isProhibitedKey("phone")).toBe(true);
      expect(isProhibitedKey("cellphone")).toBe(true);
      expect(isProhibitedKey("mobile")).toBe(true);
      expect(isProhibitedKey("telephone")).toBe(true);
    });

    it("deve detectar chaves de endereço", () => {
      expect(isProhibitedKey("address")).toBe(true);
      expect(isProhibitedKey("cep")).toBe(true);
      expect(isProhibitedKey("city")).toBe(true);
      expect(isProhibitedKey("state")).toBe(true);
      expect(isProhibitedKey("complement")).toBe(true);
      expect(isProhibitedKey("number")).toBe(true);
    });

    it("deve detectar chaves de pagamento", () => {
      expect(isProhibitedKey("card_number")).toBe(true);
      expect(isProhibitedKey("cvv")).toBe(true);
      expect(isProhibitedKey("bankAccount")).toBe(true);
    });

    it("deve detectar chaves de CPF/CNPJ", () => {
      expect(isProhibitedKey("cpf")).toBe(true);
      expect(isProhibitedKey("cnpj")).toBe(true);
    });

    it("deve detectar chaves de QR Code", () => {
      expect(isProhibitedKey("qrCodeText")).toBe(true);
      expect(isProhibitedKey("qrCode")).toBe(true);
    });

    it("deve permitir chaves seguras", () => {
      expect(isProhibitedKey("action")).toBe(false);
      expect(isProhibitedKey("page_name")).toBe(false);
      expect(isProhibitedKey("route")).toBe(false);
      expect(isProhibitedKey("section_name")).toBe(false);
    });
  });

  describe("sanitizeProps", () => {
    it("deve remover propriedades sensíveis", () => {
      const props = {
        email: "user@example.com",
        phone: "11999999999",
        action: "click",
      };

      const result = sanitizeProps(props);

      expect(result).toEqual({ action: "click" });
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
    });

    it("deve remover múltiplas propriedades sensíveis", () => {
      const props = {
        email: "user@example.com",
        cpf: "123.456.789-00",
        address: "Rua das Flores",
        cep: "12345-678",
        action: "submit",
        form_id: "signup",
      };

      const result = sanitizeProps(props);

      expect(result).toEqual({
        action: "submit",
        form_id: "signup",
      });
    });

    it("deve detectar PII com case-insensitive", () => {
      const props = {
        EMAIL: "user@example.com",
        Phone: "11999999999",
        action: "click",
      };

      const result = sanitizeProps(props);

      expect(result).toEqual({ action: "click" });
    });

    it("deve retornar objeto vazio se todas as props forem sensíveis", () => {
      const props = {
        email: "user@example.com",
        cpf: "123.456.789-00",
      };

      const result = sanitizeProps(props);

      expect(result).toEqual({});
    });

    it("deve retornar objeto vazio se props for undefined", () => {
      const result = sanitizeProps(undefined);

      expect(result).toEqual({});
    });

    it("deve retornar objeto vazio se props for vazio", () => {
      const result = sanitizeProps({});

      expect(result).toEqual({});
    });

    it("deve preservar tipos de dados", () => {
      const props = {
        count: 42,
        enabled: true,
        percentage: 3.14,
        items: ["a", "b"],
        nested: { key: "value" },
        page_name: "landing",
      };

      const result = sanitizeProps(props);

      expect(result.count).toBe(42);
      expect(result.enabled).toBe(true);
      expect(result.percentage).toBe(3.14);
      expect(result.items).toEqual(["a", "b"]);
      expect(result.nested).toEqual({ key: "value" });
      expect(result.page_name).toBe("landing");
    });

    it("deve remover propriedades que contenham palavra-chave sensível", () => {
      const props = {
        user_email: "user@example.com",
        mobile_phone: "11999999999",
        home_address: "Rua das Flores",
        action: "click",
      };

      const result = sanitizeProps(props);

      expect(result).toEqual({ action: "click" });
    });
  });

  describe("mergeProps", () => {
    it("deve mesclar contexto de página com propriedades extras", () => {
      const context = { page_name: "landing", route: "/" };
      const props = { action: "click", cta_id: "hero_primary" };

      const result = mergeProps(context, props);

      expect(result).toEqual({
        page_name: "landing",
        route: "/",
        action: "click",
        cta_id: "hero_primary",
      });
    });

    it("deve sanitizar merged properties", () => {
      const context = { page_name: "landing" };
      const props = {
        action: "click",
        email: "user@example.com",
        phone: "11999999999",
      };

      const result = mergeProps(context, props);

      expect(result).toEqual({
        page_name: "landing",
        action: "click",
      });
    });

    it("deve remover valores undefined/null/empty string", () => {
      const context = {
        page_name: "landing",
        route: undefined,
      };
      const props = {
        action: "click",
        extra: undefined,
        another: "",
        count: 0,
      };

      const result = mergeProps(context, props);

      expect(result).toEqual({
        page_name: "landing",
        action: "click",
        count: 0,
      });
    });

    it("deve manter apenas contexto se extraProps for vazio", () => {
      const context = { page_name: "landing", route: "/" };

      const result = mergeProps(context, {});

      expect(result).toEqual({
        page_name: "landing",
        route: "/",
      });
    });

    it("deve retornar objeto vazio se ambos forem vazios", () => {
      const result = mergeProps({}, {});

      expect(result).toEqual({});
    });
  });

  describe("getPageContext", () => {
    // Mock window.location
    const mockLocation = { pathname: "/landing", href: "http://localhost:3000/landing" };

    beforeEach(() => {
      Object.defineProperty(window, "location", {
        value: mockLocation,
        writable: true,
      });
    });

    it("deve retornar page_name e route", () => {
      const context = getPageContext("landing");

      expect(context.page_name).toBe("landing");
      expect(context.route).toBe("/landing");
    });

    it("deve usar route customizado quando fornecido", () => {
      const context = getPageContext("landing", "/custom-route");

      expect(context.page_name).toBe("landing");
      expect(context.route).toBe("/custom-route");
    });

    it("deve incluir referrer se disponível", () => {
      Object.defineProperty(document, "referrer", {
        value: "https://google.com",
        configurable: true,
      });

      const context = getPageContext("landing");

      expect(context.referrer).toBe("https://google.com");
    });

    it("deve retornar objeto vazio se window for undefined", () => {
      const originalWindow = global.window;
      (global as any).window = undefined;

      const context = getPageContext("landing");

      expect(context).toEqual({});

      global.window = originalWindow;
    });
  });

  describe("validateEventProperties", () => {
    beforeEach(() => {
      jest.spyOn(console, "warn").mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("deve validar page_viewed", () => {
      // Válido
      validateEventProperties("page_viewed", { page_name: "landing" });
      expect(console.warn).not.toHaveBeenCalled();

      // Inválido
      validateEventProperties("page_viewed", {});
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("page_viewed")
      );
    });

    it("deve validar section_viewed", () => {
      // Válido
      validateEventProperties("section_viewed", {
        page_name: "landing",
        section_name: "features",
        section_id: "features-1",
      });
      expect(console.warn).not.toHaveBeenCalled();

      // Inválido
      (console.warn as any).mockClear();
      validateEventProperties("section_viewed", {
        page_name: "landing",
      });
      expect(console.warn).toHaveBeenCalled();
    });

    it("deve validar form_error", () => {
      // Válido
      validateEventProperties("form_error", {
        page_name: "landing",
        form_id: "signup",
        error_type: "validation",
      });
      expect(console.warn).not.toHaveBeenCalled();

      // Inválido
      (console.warn as any).mockClear();
      validateEventProperties("form_error", {
        page_name: "landing",
        form_id: "signup",
      });
      expect(console.warn).toHaveBeenCalled();
    });

    it("não deve validar eventos desconhecidos", () => {
      validateEventProperties("custom_event", {});
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe("prepareEventProperties", () => {
    beforeEach(() => {
      Object.defineProperty(window, "location", {
        value: { pathname: "/landing" },
        writable: true,
      });
      jest.spyOn(console, "warn").mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("deve preparar propriedades completas", () => {
      const result = prepareEventProperties(
        "cta_clicked",
        "landing",
        { cta_id: "hero_primary", email: "user@example.com" }
      );

      expect(result.page_name).toBe("landing");
      expect(result.route).toBe("/landing");
      expect(result.cta_id).toBe("hero_primary");
      expect(result.email).toBeUndefined();
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe("number");
    });

    it("deve adicionar timestamp", () => {
      const beforeTime = Math.floor(Date.now() / 1000);
      const result = prepareEventProperties("cta_clicked", "landing");
      const afterTime = Math.floor(Date.now() / 1000);

      expect(result.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it("deve sanitizar propriedades sensíveis", () => {
      const result = prepareEventProperties(
        "form_submitted",
        "landing",
        {
          form_id: "signup",
          email: "user@example.com",
          cpf: "123.456.789-00",
          phone: "11999999999",
        }
      );

      expect(result.form_id).toBe("signup");
      expect(result.email).toBeUndefined();
      expect(result.cpf).toBeUndefined();
      expect(result.phone).toBeUndefined();
    });

    it("deve remover valores undefined/null/empty", () => {
      const result = prepareEventProperties(
        "cta_clicked",
        "landing",
        {
          cta_id: "hero_primary",
          extra: undefined,
          another: null,
          empty: "",
        }
      );

      expect(result.cta_id).toBe("hero_primary");
      expect(result.extra).toBeUndefined();
      expect(result.another).toBeUndefined();
      expect(result.empty).toBeUndefined();
    });
  });
});
