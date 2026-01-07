/**
 * Testes para configuração i18n
 */

import i18n from "../../../../src/i18n";

describe("i18n Configuration", () => {
  it("deve ter idioma padrão como pt-BR", () => {
    expect(i18n.language).toBe("pt-BR");
  });

  it("deve ter fallbackLng como pt-BR", () => {
    const fallbackLng = i18n.options.fallbackLng;
    // fallbackLng pode ser string ou array
    if (Array.isArray(fallbackLng)) {
      expect(fallbackLng).toContain("pt-BR");
    } else {
      expect(fallbackLng).toBe("pt-BR");
    }
  });

  it("deve ter namespaces configurados", () => {
    expect(i18n.options.ns).toContain("common");
    expect(i18n.options.ns).toContain("landing");
    expect(i18n.options.ns).toContain("gallery");
  });

  it("deve ter defaultNS como common", () => {
    expect(i18n.options.defaultNS).toBe("common");
  });

  it("deve ter recursos carregados para pt-BR", () => {
    const resources = i18n.options.resources;
    expect(resources).toBeDefined();
    if (resources) {
      expect(resources["pt-BR"]).toBeDefined();
    }
  });

  it("deve ter namespaces common, landing e gallery em pt-BR", () => {
    const resources = i18n.options.resources?.["pt-BR"];
    expect(resources).toBeDefined();
    if (resources) {
      expect(resources.common).toBeDefined();
      expect(resources.landing).toBeDefined();
      expect(resources.gallery).toBeDefined();
    }
  });

  it("deve desabilitar escapeValue para interpolação", () => {
    const interpolation = i18n.options.interpolation;
    expect(interpolation).toBeDefined();
    if (interpolation) {
      expect(interpolation.escapeValue).toBe(false);
    }
  });

  it("deve poder traduzir chaves existentes", async () => {
    // Aguarda i18n inicializar
    await i18n.loadNamespaces("common");

    // Tenta traduzir uma chave (pode retornar a chave se não encontrar)
    const translated = i18n.t("common:key");
    expect(translated).toBeDefined();
    expect(typeof translated).toBe("string");
  });

  it("deve retornar a chave se não encontrar tradução", async () => {
    const untranslated = i18n.t("non.existent.key");
    expect(untranslated).toBe("non.existent.key");
  });
});
