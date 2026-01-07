// Cypress support file
// This file runs before each test file

// Import commands for custom commands
// You can add custom commands here

// Example custom command for logging in
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/');
  cy.contains('Login').click();
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

// Custom command for filling a form
Cypress.Commands.add('fillForm', (formData: Record<string, string>) => {
  Object.entries(formData).forEach(([key, value]) => {
    cy.get(`[name="${key}"]`).type(value);
  });
});

// Declare custom commands type
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      fillForm(formData: Record<string, string>): Chainable<void>;
    }
  }
}
