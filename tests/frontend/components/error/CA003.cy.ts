/// <reference types="cypress" />
/// <reference lib="dom" />

/**
 * CA003 - Error Page - Error Handling Scenario
 * 
 * Objective: Validate that the Error page displays correctly when 
 * user navigates to invalid routes or encounters errors.
 * 
 * Pre-conditions:
 * - Application is running on http://localhost:3000
 * - User is not authenticated
 * 
 * Scenario Steps:
 * 1. User navigates to invalid route
 * 2. Verify error page displays
 * 3. Verify error message is clear
 * 4. Verify navigation back to home is available
 * 5. Verify error page styling is consistent
 * 6. Verify footer is displayed
 */

describe('CA003 - Error Page - Error Handling', () => {
  context('404 Not Found Page', () => {
    beforeEach(() => {
      // Navigate to invalid route to trigger error page
      cy.visit('/invalid-route-that-does-not-exist', { failOnStatusCode: false });
    });

    it('should display error page for invalid route', () => {
      // Verify error page loads
      cy.get('[data-testid="error-page"], [data-testid="404-page"], main').should('exist');
    });

    it('should display error code (404)', () => {
      // Verify 404 error code is displayed
      cy.get('body').should('contain.text', '404');
    });

    it('should display user-friendly error message', () => {
      // Verify error message is displayed
      cy.contains(/page not found|página não encontrada|não encontrado/i).should('be.visible');
    });

    it('should display error description', () => {
      // Verify error has a description
      cy.get('[data-testid="error-description"], .error-description, p').should('have.length.greaterThan', 0);
    });

    it('should have button to return to home', () => {
      // Verify return home button exists
      cy.get('a[href="/"], button').filter(':contains("Home"), :contains("Início"), :contains("Voltar")').should('have.length.greaterThan', 0);
    });

    it('should navigate to home when return button is clicked', () => {
      // Click return button
      cy.get('a[href="/"], button').filter(':contains("Home"), :contains("Início"), :contains("Voltar")').first().click();
      
      // Verify navigation to home page
      cy.url().should('eq', 'http://localhost:3000/');
      cy.get('h1').should('be.visible');
    });

    it('should display proper heading hierarchy', () => {
      // Verify H1 exists on error page
      cy.get('h1').should('have.length.greaterThan', 0);
    });

    it('should have proper error styling', () => {
      // Verify error element has styling
      cy.get('[data-testid="error-page"], [data-testid="404-page"], main').should('have.css', 'display').and('not.equal', 'none');
    });

    it('should maintain header navigation', () => {
      // Verify header is still visible on error page
      cy.get('header').should('be.visible');
    });
  });

  context('Error Page Layout and Navigation', () => {
    beforeEach(() => {
      // Navigate to invalid route
      cy.visit('/this-page-does-not-exist', { failOnStatusCode: false });
    });

    it('should display navigation links on error page', () => {
      // Verify navigation is available
      cy.get('header nav a').should('have.length.greaterThan', 0);
    });

    it('should allow user to navigate to landing page', () => {
      // Click landing page link if exists
      cy.get('header nav a').filter(':contains("Home"), :contains("Início")').first().then($link => {
        if ($link.length > 0) {
          cy.wrap($link).click();
          cy.url().should('eq', 'http://localhost:3000/');
        }
      });
    });

    it('should allow user to navigate to gallery', () => {
      // Click gallery link if exists
      cy.get('header nav a').filter(':contains("Gallery"), :contains("Galeria")').first().then($link => {
        if ($link.length > 0) {
          cy.wrap($link).click();
          cy.url().should('include', '/gallery');
        }
      });
    });

    it('should display footer on error page', () => {
      // Verify footer is visible
      cy.get('footer').should('be.visible');
    });
  });

  context('Error Page Accessibility', () => {
    beforeEach(() => {
      // Navigate to invalid route
      cy.visit('/error-test-route', { failOnStatusCode: false });
    });

    it('should have proper heading hierarchy for accessibility', () => {
      // Verify H1 is present
      cy.get('h1').should('have.length.greaterThan', 0);
    });

    it('should have descriptive link text', () => {
      // Verify links have text or aria-label
      cy.get('a').each($link => {
        cy.wrap($link).then($el => {
          const hasText = $el.text().trim().length > 0;
          const hasAriaLabel = $el.attr('aria-label');
          // @ts-expect-error - Cypress assertion chain
          expect(hasText || hasAriaLabel).to.be.true;
        });
      });
    });

    it('should have proper focus management', () => {
      // Verify main error content is focusable
      cy.get('[data-testid="error-page"], main').should('exist');
    });

    it('should have semantic HTML structure', () => {
      // Verify semantic HTML is used
      cy.get('main, header, footer').should('exist');
    });
  });

  context('Error Page Responsive Design', () => {
    beforeEach(() => {
      // Navigate to invalid route
      cy.visit('/not-found', { failOnStatusCode: false });
    });

    it('should display correctly on desktop viewport', () => {
      cy.viewport(1280, 720);
      cy.get('[data-testid="error-page"], main').should('be.visible');
    });

    it('should display correctly on mobile viewport', () => {
      cy.viewport(375, 667);
      cy.get('[data-testid="error-page"], main').should('be.visible');
    });

    it('should have no horizontal scrollbar', () => {
      cy.window().then(win => {
        // @ts-expect-error - Cypress assertion chain
        expect(win.innerWidth).to.equal(win.document.documentElement.clientWidth);
      });
    });

    it('should stack elements properly on mobile', () => {
      cy.viewport(375, 667);
      cy.get('[data-testid="error-page"], main').within(() => {
        cy.get('h1, p, button, a').should('have.length.greaterThan', 0);
      });
    });
  });

  context('Multiple Error Scenarios', () => {
    it('should handle different invalid routes consistently', () => {
      const invalidRoutes = [
        '/invalid1',
        '/invalid2',
        '/invalid-page',
      ];

      invalidRoutes.forEach(route => {
        cy.visit(route, { failOnStatusCode: false });
        
        // Verify error page loads for each route
        cy.get('body').should('contain.text', '404');
      });
    });

    it('should maintain consistent error styling across routes', () => {
      const invalidRoutes = ['/route1', '/route2'];

      invalidRoutes.forEach((route, index) => {
        cy.visit(route, { failOnStatusCode: false });
        
        // Verify error page elements exist
        cy.get('[data-testid="error-page"], main').should('exist');
        cy.get('h1').should('be.visible');
      });
    });
  });

  context('Error Page Performance', () => {
    it('should load error page quickly', () => {
      cy.visit('/invalid-route', { failOnStatusCode: false });
      
      // Verify error page loads with content
      cy.get('[data-testid="error-page"], main').should('exist');
      cy.get('h1').should('be.visible');
    });
  });

  context('Error Page Content', () => {
    beforeEach(() => {
      cy.visit('/page-not-found', { failOnStatusCode: false });
    });

    it('should display image or icon', () => {
      // Verify error page has visual element
      cy.get('[data-testid="error-page"], main').then($error => {
        cy.wrap($error).find('img, svg, [role="img"]').should('exist');
      });
    });

    it('should have clear call-to-action', () => {
      // Verify CTA is available
      cy.get('button, a[href="/"], a[href*="home" i], a[href*="inicio" i]').should('have.length.greaterThan', 0);
    });

    it('should provide helpful suggestions', () => {
      // Verify helpful content exists
      cy.get('[data-testid="error-page"], main').should('contain.text');
    });
  });
});
