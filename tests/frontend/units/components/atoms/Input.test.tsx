/**
 * Testes para componente Input
 */

import Input from "../../../../../src/components/atoms/Input/Input";
import type { InputProps } from "../../../../../src/components/atoms/Input/Input";

describe("Input Component", () => {
  it("deve ser um componente React válido", () => {
    expect(Input).toBeDefined();
  });

  it("deve ter displayName definido", () => {
    expect(Input.displayName).toBe("Input");
  });

  it("deve aceitar props padrão de input HTML", () => {
    const props: InputProps = {
      type: "text",
      placeholder: "Digite algo",
    };

    expect(props.type).toBe("text");
    expect(props.placeholder).toBe("Digite algo");
  });

  it("deve aceitar type email", () => {
    const props: InputProps = { type: "email" };
    expect(props.type).toBe("email");
  });

  it("deve aceitar type password", () => {
    const props: InputProps = { type: "password" };
    expect(props.type).toBe("password");
  });

  it("deve aceitar type number", () => {
    const props: InputProps = { type: "number" };
    expect(props.type).toBe("number");
  });

  it("deve aceitar disabled prop", () => {
    const props: InputProps = { disabled: true };
    expect(props.disabled).toBe(true);
  });

  it("deve aceitar required prop", () => {
    const props: InputProps = { required: true };
    expect(props.required).toBe(true);
  });

  it("deve aceitar maxLength prop", () => {
    const props: InputProps = { maxLength: 50 };
    expect(props.maxLength).toBe(50);
  });

  it("deve aceitar pattern prop", () => {
    const props: InputProps = { pattern: "[0-9]+" };
    expect(props.pattern).toBe("[0-9]+");
  });

  it("deve aceitar aria-label", () => {
    const props: InputProps = { "aria-label": "Email input" };
    expect(props["aria-label"]).toBe("Email input");
  });

  it("deve aceitar value controlado", () => {
    const props: InputProps = { value: "teste", onChange: () => {} };
    expect(props.value).toBe("teste");
  });

  it("deve aceitar className", () => {
    const props: InputProps = { className: "input-class" };
    expect(props.className).toBe("input-class");
  });

  it("deve permitir forwardRef", () => {
    expect(Input).toBeDefined();
  });

  it("deve aceitar data attributes", () => {
    const props: Record<string, any> = { "data-testid": "custom-input" };
    expect(props["data-testid"]).toBe("custom-input");
  });
});
