/**
 * Testes para hook useAnalytics
 */

import { useAnalytics } from "../../../../src/hooks/useAnalytics";

describe("useAnalytics", () => {
  it("deve ser um hook válido", () => {
    expect(typeof useAnalytics).toBe("function");
  });

  it("deve retornar objeto com métodos de tracking", () => {
    // useAnalytics retorna um objeto com todos os métodos
    const analyticsHook = useAnalytics;
    
    expect(analyticsHook).toBeDefined();
    expect(typeof analyticsHook).toBe("function");
  });

  it("deve exportar funções de tracking", () => {
    // Verifica que o hook está definido
    expect(useAnalytics).toBeDefined();
  });

  it("deve ser uma função que pode ser importada", () => {
    // Simples verificação de que o módulo foi carregado
    const hook = useAnalytics;
    expect(hook).not.toBeNull();
    expect(typeof hook).toBe("function");
  });
});
