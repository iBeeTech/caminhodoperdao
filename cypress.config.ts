import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    specPattern: ['cypress/e2e/**/*.cy.ts', 'tests/frontend/components/**/*.cy.ts'],
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  env: {
    tsConfig: 'tsconfig.cypress.json'
  }
});
