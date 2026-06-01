import { defineConfig } from "vitest/config";

// Vitest roda os testes de backend / Cloudflare Functions (tests/backend),
// que importam de "vitest" e exercitam código no estilo Workers (Request, D1).
// Os testes de front (tests/frontend/units) rodam no jest (script test:unit).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/backend/**/*.test.ts"],
    exclude: ["tests/frontend/**", "cypress/**/*", "node_modules"],
    globals: true,
  },
});
