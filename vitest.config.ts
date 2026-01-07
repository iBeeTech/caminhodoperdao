import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/frontend/units/**/*.test.ts", "tests/frontend/units/**/*.test.tsx"],
    exclude: ["tests/frontend/components/**/*.cy.ts", "cypress/**/*", "node_modules"],
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
  },
});
