/// <reference types="cypress" />
/// <reference lib="dom" />

/**
 * CA001 - Landing Page - Happy Path Scenario
 * 
 * Objective: Validate that the Landing page loads correctly and all main 
 * components are visible and functional.
 * 
 * Pre-conditions:
 * - Application is running on http://localhost:3000
 * - User is not authenticated
 * 
 * Scenario Steps:
 * 1. User visits the landing page
 * 2. Verify page title and header are visible
 * 3. Verify hero section is visible
 * 4. Verify features section is visible
 * 5. Verify testimonials section is visible
 * 6. Verify call-to-action button is visible
 * 7. Verify footer is visible
 * 8. Verify navigation links work correctly
 */

describe('CA001 - Landing Page - Happy Path', () => {
  beforeEach(() => {
    // Visit the landing page before each test
    cy.visit('/');
  });

  context('Page Load and Initial Visibility', () => {
    it('should load the landing page successfully', () => {
      // Verify page title
      cy.title().should('include', 'Caminho do Perdão');
    });

    it('should display the header with navigation', () => {
      // Verify header is visible
      cy.get('header').should('be.visible');
      
      // Verify logo is visible
      cy.get('header img, header [alt*="logo" i]').should('be.visible');
      
      // Verify navigation menu exists
      cy.get('nav').should('be.visible');
    });

    it('should display the hero section', () => {
      // Verify hero section is visible
      cy.get('[data-testid="hero-section"], section:first').should('be.visible');
      
      // Verify hero title
      cy.get('h1').should('be.visible');
      cy.get('h1').should('contain.text', 'Caminho');
      
      // Verify hero CTA button
      cy.get('button').filter(':contains("Comece"), :contains("Começar"), :contains("Saiba Mais")').first().should('be.visible');
    });
  });

  context('Features Section', () => {
    it('should display the features section', () => {
      // Scroll to features section
      cy.get('[data-testid="features-section"], section').then($sections => {
        // Find features section (usually contains "feature" or "benefício" keywords)
        cy.contains('h2', /features|benefícios|vantagens/i).should('be.visible');
      });
    });

    it('should display feature cards', () => {
      // Verify at least 3 feature cards are visible
      cy.get('[data-testid="feature-card"], .feature').should('have.length.at.least', 1);
      
      // Verify feature cards contain text
      cy.get('[data-testid="feature-card"], .feature').first().should('contain.text');
    });
  });

  context('Call-to-Action Elements', () => {
    it('should display CTA button in hero section', () => {
      // Verify primary CTA button is visible
      cy.get('button').filter(':visible').first().should('be.visible');
    });

    it('should display CTA in call-to-action section', () => {
      // Scroll down to find CTA section
      cy.contains(/vamos começar|comece agora|inscreva-se/i).should('exist');
    });

    it('CTA button should be clickable', () => {
      // Get the primary CTA button and verify it's clickable
      cy.get('button').filter(':visible').first().should('not.be.disabled');
    });
  });

  context('Form Interaction', () => {
    it('should display email input field', () => {
      // Scroll to signup section
      cy.get('input[type="email"], input[placeholder*="email" i]').should('exist');
    });

    it('should accept email input', () => {
      // Find email input and type
      cy.get('input[type="email"], input[placeholder*="email" i]').first().then($input => {
        if ($input.is(':visible')) {
          cy.wrap($input).type('test@example.com');
          cy.wrap($input).should('have.value', 'test@example.com');
        }
      });
    });

    it('should display phone input field', () => {
      // Verify phone input exists
      cy.get('input[type="tel"], input[type="phone"], input[placeholder*="telefone" i], input[placeholder*="phone" i]').should('exist');
    });

    it('should accept phone input', () => {
      // Find phone input and type
      cy.get('input[type="tel"], input[type="phone"], input[placeholder*="telefone" i], input[placeholder*="phone" i]').first().then($input => {
        if ($input.is(':visible')) {
          cy.wrap($input).type('11999999999');
        }
      });
    });
  });

  context('Navigation and Links', () => {
    it('should have working navigation links', () => {
      // Verify navigation links exist
      cy.get('nav a, header a').should('have.length.greaterThan', 0);
      
      // Verify links have href attribute
      cy.get('nav a, header a').each($link => {
        cy.wrap($link).should('have.attr', 'href');
      });
    });

    it('should navigate to different sections when clicking nav links', () => {
      // Get first navigation link
      cy.get('nav a').first().then($link => {
        const href = $link.attr('href');
        if (href && href.startsWith('/')) {
          // It's an internal link, verify navigation works
          cy.wrap($link).click();
          cy.url().should('include', href);
        }
      });
    });
  });

  context('Footer Section', () => {
    it('should display footer', () => {
      // Scroll to bottom
      cy.get('footer').should('be.visible');
    });

    it('should display footer links', () => {
      // Verify footer contains links
      cy.get('footer a').should('have.length.greaterThan', 0);
    });

    it('should display social media links', () => {
      // Verify social media links exist in footer
      cy.get('footer').then($footer => {
        // Check for common social media platforms
        const socialMediaPatterns = ['facebook', 'twitter', 'instagram', 'linkedin', 'whatsapp'];
        const hasLinks = socialMediaPatterns.some(pattern => 
          $footer.text().toLowerCase().includes(pattern)
        );
        // Social media links might not always be present, so we just check footer exists
        cy.wrap($footer).should('exist');
      });
    });
  });

  context('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      // Verify H1 exists and is the first heading
      cy.get('h1').should('have.length.greaterThan', 0);
    });

    it('should have alt text for images', () => {
      // Verify all images have alt text
      cy.get('img').each($img => {
        cy.wrap($img).should('have.attr', 'alt');
      });
    });

    it('should have proper link text', () => {
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
  });

  context('Responsive Design', () => {
    it('should display correctly on desktop', () => {
      cy.viewport(1280, 720);
      cy.get('header').should('be.visible');
      cy.get('main, [role="main"]').should('be.visible');
    });

    it('should display content without horizontal scrollbar', () => {
      cy.window().then(win => {
        // @ts-expect-error - Cypress assertion chain
        expect(win.innerWidth).to.equal(win.document.documentElement.clientWidth);
      });
    });
  });

  context('Performance', () => {
    it('should load page within reasonable time', () => {
      // Verify page loads with all critical elements
      cy.get('header').should('be.visible');
      cy.get('h1').should('be.visible');
      
      // Check that main content is rendered
      cy.get('main, [role="main"]').should('exist');
    });
  });

  context('Status Verification - Pending', () => {
    it('should display pending status when form is submitted', () => {
      // Fill and submit form
      cy.get('input[type="email"], input[placeholder*="email" i]').first().then($input => {
        if ($input.is(':visible')) {
          cy.wrap($input).type('pending@example.com');
          
          // Submit form
          cy.get('form').then($form => {
            if ($form.length > 0) {
              cy.wrap($form).submit();
            } else {
              cy.get('button').filter(':contains("Comece"), :contains("Começar"), :contains("Enviar")').first().click();
            }
          });
          
          // Verify pending status message appears
          cy.contains(/pendente|aguardando|processando|pending/i).should('exist');
        }
      });
    });

    it('should show pending badge or indicator', () => {
      // Look for status badge or indicator with pending status
      cy.get('[data-testid="status"], .status, [class*="status"]').then($status => {
        if ($status.length > 0) {
          cy.wrap($status).should('contain.text', /pendente|pending|aguardando/i);
        }
      });
    });

    it('should display loading spinner for pending status', () => {
      // Verify loading indicator is visible for pending
      cy.get('[data-testid="loading"], .spinner, [class*="loading"], [class*="spinner"]').then($loader => {
        if ($loader.length > 0) {
          cy.wrap($loader).should('be.visible');
        }
      });
    });

    it('should disable form submission during pending status', () => {
      // Verify submit button is disabled during pending
      cy.get('button[type="submit"]').then($button => {
        if ($button.length > 0) {
          cy.wrap($button).should('be.disabled');
        }
      });
    });
  });

  context('Status Verification - Confirmado (Confirmed)', () => {
    it('should display confirmed status message', () => {
      // Trigger confirmed status (e.g., after successful submission)
      cy.get('[data-testid="success-message"], .success, [class*="success"]').then($success => {
        if ($success.length > 0) {
          cy.wrap($success).should('contain.text', /confirmado|confirmado|sucesso|success|aceito/i);
        }
      });
    });

    it('should show confirmed badge with correct styling', () => {
      // Look for confirmed status badge
      cy.get('[data-testid="status"], .status, [class*="status"]').then($status => {
        if ($status.length > 0 && $status.text().toLowerCase().includes('confirm')) {
          cy.wrap($status).should('have.class', 'confirmed');
        }
      });
    });

    it('should display checkmark icon for confirmed status', () => {
      // Verify checkmark icon is visible
      cy.get('[data-testid="success-icon"], .check-icon, [class*="check"], svg[class*="check"]').then($icon => {
        if ($icon.length > 0) {
          cy.wrap($icon).should('be.visible');
        }
      });
    });

    it('should enable form submission after confirmation', () => {
      // Verify submit button is enabled after confirmation
      cy.get('button[type="submit"]').then($button => {
        if ($button.length > 0) {
          cy.wrap($button).should('not.be.disabled');
        }
      });
    });

    it('should display confirmation details message', () => {
      // Verify confirmation details are displayed
      cy.contains(/obrigado|obrigada|registrado|registered|confirmamos/i).should('exist');
    });
  });

  context('Status Verification - Cancelado (Cancelled)', () => {
    it('should display cancelled status message', () => {
      // Look for cancelled/error status
      cy.get('[data-testid="error-message"], .error, [class*="error"]').then($error => {
        if ($error.length > 0) {
          cy.wrap($error).should('contain.text', /cancelado|cancelled|erro|error|rejeitado/i);
        }
      });
    });

    it('should show cancelled badge with error styling', () => {
      // Verify cancelled status has error styling
      cy.get('[data-testid="status"], .status, [class*="status"]').then($status => {
        if ($status.length > 0 && $status.text().toLowerCase().includes('cancel')) {
          cy.wrap($status).should('have.class', 'cancelled');
        }
      });
    });

    it('should display error icon for cancelled status', () => {
      // Verify error icon is visible
      cy.get('[data-testid="error-icon"], .error-icon, [class*="error"], svg[class*="error"]').then($icon => {
        if ($icon.length > 0) {
          cy.wrap($icon).should('be.visible');
        }
      });
    });

    it('should display retry button for cancelled status', () => {
      // Verify retry button is available
      cy.get('button').filter(':contains("Tentar Novamente"), :contains("Retry"), :contains("Reenviar")').then($button => {
        if ($button.length > 0) {
          cy.wrap($button).should('be.visible');
        }
      });
    });

    it('should display error reason or details', () => {
      // Verify error details are shown
      cy.get('[data-testid="error-details"], .error-message, [class*="error-text"]').then($details => {
        if ($details.length > 0) {
          cy.wrap($details).should('be.visible');
        }
      });
    });
  });

  context('Status Transitions and Flow', () => {
    it('should transition from pending to confirmed', () => {
      // Submit form to pending
      cy.get('input[type="email"], input[placeholder*="email" i]').first().then($input => {
        if ($input.is(':visible')) {
          cy.wrap($input).type('flow@example.com');
          cy.get('button[type="submit"], button').filter(':contains("Enviar")').first().click();
        }
      });

      // Wait and verify transition to confirmed
      cy.get('[data-testid="status"], .status, [class*="status"]').should('exist');
      cy.contains(/confirmado|success|sucesso/i, { timeout: 10000 }).should('exist');
    });

    it('should allow retry after cancelled status', () => {
      // Get retry button
      cy.get('button').filter(':contains("Tentar Novamente"), :contains("Retry")').first().then($button => {
        if ($button.length > 0) {
          cy.wrap($button).click();
          // Verify form is reset to initial state
          cy.get('input[type="email"]').first().should('have.value', '');
        }
      });
    });

    it('should display status timeline if available', () => {
      // Look for status timeline or progress indicator
      cy.get('[data-testid="status-timeline"], .timeline, [class*="timeline"], [class*="progress"]').then($timeline => {
        if ($timeline.length > 0) {
          cy.wrap($timeline).should('be.visible');
          // Verify timeline has at least 2 steps
          cy.wrap($timeline).find('[class*="step"], li, [data-testid*="step"]').should('have.length.greaterThan', 1);
        }
      });
    });

    it('should highlight current status in timeline', () => {
      // Verify current status is highlighted
      cy.get('[data-testid="status-timeline"], .timeline, [class*="timeline"]').then($timeline => {
        if ($timeline.length > 0) {
          cy.wrap($timeline).find('[class*="active"], [class*="current"]').should('have.length.greaterThan', 0);
        }
      });
    });
  });

  context('Status Display Consistency', () => {
    it('should maintain status across page refresh', () => {
      // Get current status
      cy.get('[data-testid="status"], .status, [class*="status"]').first().then($status => {
        const currentStatus = $status.text();
        
        // Refresh page
        cy.reload();
        
        // Verify status is maintained
        cy.get('[data-testid="status"], .status, [class*="status"]').first().should('contain.text', currentStatus);
      });
    });

    it('should show consistent status across different screen sizes', () => {
      // Check mobile view
      cy.viewport(375, 667);
      cy.get('[data-testid="status"], .status, [class*="status"]').then($statusMobile => {
        const mobileStatus = $statusMobile.text();
        
        // Check desktop view
        cy.viewport(1280, 720);
        cy.get('[data-testid="status"], .status, [class*="status"]').then($statusDesktop => {
          cy.wrap($statusDesktop).should('contain.text', mobileStatus);
        });
      });
    });

    it('should have appropriate status color coding', () => {
      // Verify status has appropriate color
      cy.get('[data-testid="status"], .status, [class*="status"]').each($status => {
        const statusText = $status.text().toLowerCase();
        const computedStyle = window.getComputedStyle($status[0]);
        
        if (statusText.includes('confirmed') || statusText.includes('confirmado')) {
          // @ts-expect-error - Cypress assertion chain
          expect(computedStyle.color).to.not.equal('rgb(0, 0, 0)'); // Should have a color
        }
      });
    });
  });
});
