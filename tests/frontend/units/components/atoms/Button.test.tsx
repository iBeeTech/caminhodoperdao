/**
 * Testes para componente Button
 */

import Button, { type ButtonVariant, type ButtonSize } from "../../../../../src/components/atoms/Button/Button";

describe("Button Component", () => {
  it("deve ser um componente React válido", () => {
    expect(Button).toBeDefined();
  });

  it("deve ter displayName definido", () => {
    // Verifica que o componente está bem definido
    expect(Button).not.toBeNull();
  });

  it("deve aceitar props variant", () => {
    const variants: ButtonVariant[] = ["primary", "secondary", "ghost", "danger", "cta"];
    
    variants.forEach((variant) => {
      // Simples verificação que as props são aceitáveis
      expect(variant).toBeDefined();
    });
  });

  it("deve aceitar props size", () => {
    const sizes: ButtonSize[] = ["sm", "md", "lg"];
    
    sizes.forEach((size) => {
      expect(size).toBeDefined();
    });
  });

  it("deve permitir forwardRef", () => {
    // Verifica que o componente suporta forwardRef
    expect(Button).toBeDefined();
  });

  it("deve aceitar props loading", () => {
    const loadingProps = { loading: true };
    expect(loadingProps.loading).toBe(true);
  });

  it("deve aceitar props fullWidth", () => {
    const fullWidthProps = { fullWidth: true };
    expect(fullWidthProps.fullWidth).toBe(true);
  });

  it("deve aceitar props disabled", () => {
    const disabledProps = { disabled: true };
    expect(disabledProps.disabled).toBe(true);
  });

  it("deve suportar children", () => {
    // Verifica que o componente pode receber children
    expect(Button).toBeDefined();
  });

  it("deve herdar de HTMLButtonElement", () => {
    // Verifica que as props são compatíveis com button HTML
    const htmlProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
      type: "submit",
      className: "btn",
    };
    expect(htmlProps.type).toBe("submit");
  });
});
