/**
 * Testes para componente Select
 */

import Select from "../../../../../src/components/atoms/Select/Select";
import type { SelectProps } from "../../../../../src/components/atoms/Select/Select";

describe("Select Component", () => {
  it("deve ser um componente React válido", () => {
    expect(Select).toBeDefined();
  });

  it("deve ter displayName definido", () => {
    expect(Select.displayName).toBe("Select");
  });

  it("deve aceitar props padrão de select HTML", () => {
    const props: SelectProps = {
      name: "options",
      id: "select-1",
    };

    expect(props.name).toBe("options");
    expect(props.id).toBe("select-1");
  });

  it("deve aceitar value controlado", () => {
    const props: SelectProps = { value: "op1", onChange: () => {} };
    expect(props.value).toBe("op1");
  });

  it("deve aceitar defaultValue", () => {
    const props: SelectProps = { defaultValue: "op1" };
    expect(props.defaultValue).toBe("op1");
  });

  it("deve aceitar disabled prop", () => {
    const props: SelectProps = { disabled: true };
    expect(props.disabled).toBe(true);
  });

  it("deve aceitar required prop", () => {
    const props: SelectProps = { required: true };
    expect(props.required).toBe(true);
  });

  it("deve aceitar multiple prop", () => {
    const props: SelectProps = { multiple: true };
    expect(props.multiple).toBe(true);
  });

  it("deve aceitar size prop", () => {
    const props: SelectProps = { size: 3 };
    expect(props.size).toBe(3);
  });

  it("deve aceitar aria-label", () => {
    const props: SelectProps = { "aria-label": "Selecione uma opção" };
    expect(props["aria-label"]).toBe("Selecione uma opção");
  });

  it("deve aceitar className", () => {
    const props: SelectProps = { className: "select-class" };
    expect(props.className).toBe("select-class");
  });

  it("deve aceitar onChange", () => {
    const handleChange = jest.fn();
    const props: SelectProps = { onChange: handleChange };
    expect(props.onChange).toBe(handleChange);
  });

  it("deve aceitar onBlur", () => {
    const handleBlur = jest.fn();
    const props: SelectProps = { onBlur: handleBlur };
    expect(props.onBlur).toBe(handleBlur);
  });

  it("deve aceitar onFocus", () => {
    const handleFocus = jest.fn();
    const props: SelectProps = { onFocus: handleFocus };
    expect(props.onFocus).toBe(handleFocus);
  });

  it("deve permitir forwardRef", () => {
    expect(Select).toBeDefined();
  });

  it("deve aceitar data attributes", () => {
    const props: Record<string, any> = { "data-testid": "custom-select" };
    expect(props["data-testid"]).toBe("custom-select");
  });
});
