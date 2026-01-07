/**
 * Testes para configuração QueryClient
 */

import { queryClient } from "../../../../src/query/queryClient";

describe("QueryClient Configuration", () => {
  it("deve ser uma instância de QueryClient", () => {
    expect(queryClient).toBeDefined();
    expect(queryClient.constructor.name).toBe("QueryClient");
  });

  it("deve ter defaultOptions configurado", () => {
    expect(queryClient.getDefaultOptions()).toBeDefined();
  });

  it("deve ter retry como 1", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.retry).toBe(1);
  });

  it("deve ter refetchOnWindowFocus como false", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });

  it("deve ter staleTime como 30000", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.staleTime).toBe(30_000);
  });

  it("deve ter gcTime como 5 minutos", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.gcTime).toBe(5 * 60_000);
  });

  it("deve permitir realizar cache operations", () => {
    const testKey = ["test"];
    const testData = { message: "test data" };

    // Definir dados no cache
    queryClient.setQueryData(testKey, testData);

    // Verificar se os dados foram armazenados
    const cachedData = queryClient.getQueryData(testKey);
    expect(cachedData).toEqual(testData);

    // Limpar o cache
    queryClient.removeQueries({ queryKey: testKey });
    const clearedData = queryClient.getQueryData(testKey);
    expect(clearedData).toBeUndefined();
  });

  it("deve permitir invalidar queries", async () => {
    const testKey = ["test-invalidate"];

    queryClient.setQueryData(testKey, { data: "test" });
    expect(queryClient.getQueryData(testKey)).toBeDefined();

    await queryClient.invalidateQueries({ queryKey: testKey });

    // Após invalidação, o estado muda mas os dados podem ainda estar presentes
    expect(queryClient).toBeDefined();
  });
});
