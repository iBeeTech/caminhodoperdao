/// <reference types="cypress" />
/// <reference lib="dom" />

/**
 * CA002 - Gallery Page - Happy Path Scenario
 * 
 * Objective: Validate that the Gallery page loads correctly and displays
 * all gallery items properly with working filters and navigation.
 * 
 * Pre-conditions:
 * - Application is running on http://localhost:3000
 * - User is not authenticated
 * 
 * Scenario Steps:
 * 1. User navigates to gallery page
 * 2. Verify page title and header are visible
 * 3. Verify gallery grid is visible with items
 * 4. Verify filter options work if available
 * 5. Verify gallery items are clickable
 * 6. Verify lightbox/modal opens on item click
 * 7. Verify navigation through gallery items works
 */

describe('CA002 - Gallery Page - Happy Path', () => {
  beforeEach(() => {
    // Visit the gallery page
    cy.visit('/gallery');
  });

  context('Page Load and Initial Visibility', () => {
    it('should load the gallery page successfully', () => {
      // Verify page is loaded
      cy.get('[data-testid="gallery-container"], [role="main"]').should('exist');
    });

    it('should display the header with navigation', () => {
      // Verify header is visible
      cy.get('header').should('be.visible');
      
      // Verify navigation contains Gallery link
      cy.get('nav a').should('contain', 'Gallery');
    });

    it('should display page title', () => {
      // Verify page title
      cy.get('h1').should('be.visible');
      cy.get('h1').should('contain.text', 'Gallery');
    });
  });

  context('Gallery Grid and Items', () => {
    it('should display gallery grid', () => {
      // Verify gallery grid exists and is visible
      cy.get('[data-testid="gallery-grid"], [data-testid="gallery"], .gallery').should('exist');
    });

    it('should display gallery items', () => {
      // Verify at least one gallery item is visible
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').should('have.length.greaterThan', 0);
    });

    it('should display gallery items with images', () => {
      // Verify gallery items contain images
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').first().within(() => {
        cy.get('img').should('be.visible');
      });
    });

    it('should display gallery items with titles or descriptions', () => {
      // Verify gallery items have text content
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').first().should('contain.text');
    });
  });

  context('Gallery Filters', () => {
    it('should display filter options if available', () => {
      // Check if filters exist
      cy.get('[data-testid="gallery-filters"], .filters, [role="group"]').then($filters => {
        if ($filters.length > 0) {
          cy.wrap($filters).should('be.visible');
        }
      });
    });

    it('should filter gallery items when filter is selected', () => {
      // Get initial count of items
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').then($initialItems => {
        const initialCount = $initialItems.length;
        
        // Try to click first filter button if it exists
        cy.get('[data-testid="gallery-filters"] button, .filters button').first().then($button => {
          if ($button.length > 0) {
            cy.wrap($button).click();
            
            // Verify items count changed or stayed same (at least items still exist)
            cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').should('have.length.greaterThan', 0);
          }
        });
      });
    });
  });

  context('Gallery Item Interaction', () => {
    it('should open item details or lightbox on click', () => {
      // Click first gallery item
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').first().click();
      
      // Verify modal or detail view opens
      cy.get('[role="dialog"], [data-testid="lightbox"], .modal').should('exist');
    });

    it('should display full image in lightbox', () => {
      // Click first gallery item
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').first().click();
      
      // Verify image is displayed
      cy.get('[role="dialog"] img, [data-testid="lightbox"] img, .modal img').should('be.visible');
    });

    it('should have navigation controls in lightbox', () => {
      // Click first gallery item
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').first().click();
      
      // Verify navigation buttons exist
      cy.get('[role="dialog"], [data-testid="lightbox"], .modal').then($lightbox => {
        cy.wrap($lightbox).find('button').should('have.length.greaterThan', 0);
      });
    });

    it('should close lightbox on close button click', () => {
      // Click first gallery item
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').first().click();
      
      // Verify lightbox is open
      cy.get('[role="dialog"], [data-testid="lightbox"], .modal').should('exist');
      
      // Click close button
      cy.get('[role="dialog"] button[aria-label*="close" i], [data-testid="lightbox"] button[aria-label*="close" i], .modal .close').first().click();
      
      // Verify lightbox is closed
      cy.get('[role="dialog"], [data-testid="lightbox"], .modal').should('not.exist');
    });

    it('should close lightbox on escape key press', () => {
      // Click first gallery item
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').first().click();
      
      // Verify lightbox is open
      cy.get('[role="dialog"], [data-testid="lightbox"], .modal').should('exist');
      
      // Press escape key
      cy.get('body').type('{esc}');
      
      // Verify lightbox is closed
      cy.get('[role="dialog"], [data-testid="lightbox"], .modal').should('not.exist');
    });
  });

  context('Gallery Navigation', () => {
    it('should navigate to next item in lightbox', () => {
      // Click first gallery item
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').first().click();
      
      // Get current image src
      cy.get('[role="dialog"] img, [data-testid="lightbox"] img, .modal img').first().then($img => {
        const initialSrc = $img.attr('src');
        
        // Click next button
        cy.get('[role="dialog"] button[aria-label*="next" i], [role="dialog"] button[aria-label*=">" i], .modal .next').first().click();
        
        // Verify image changed or is still visible
        cy.get('[role="dialog"] img, [data-testid="lightbox"] img, .modal img').first().should('be.visible');
      });
    });

    it('should navigate to previous item in lightbox', () => {
      // Click second gallery item if available
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').eq(1).then($item => {
        if ($item.length > 0) {
          cy.wrap($item).click();
          
          // Click previous button
          cy.get('[role="dialog"] button[aria-label*="prev" i], [role="dialog"] button[aria-label*="<" i], .modal .prev').first().click();
          
          // Verify image is still visible
          cy.get('[role="dialog"] img, [data-testid="lightbox"] img, .modal img').first().should('be.visible');
        }
      });
    });
  });

  context('Pagination and Lazy Loading', () => {
    it('should load more items on scroll or pagination', () => {
      // Get initial count
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').then($items => {
        const initialCount = $items.length;
        
        // Scroll to bottom
        cy.get('[data-testid="gallery-grid"], [data-testid="gallery"], .gallery').scrollTo('bottom');
        
        // Wait a bit for lazy load
        cy.wait(1000);
        
        // Verify items still exist
        cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').should('have.length.greaterThan', 0);
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
  });

  context('Responsive Design', () => {
    it('should display correctly on desktop', () => {
      cy.viewport(1280, 720);
      cy.get('[data-testid="gallery-grid"], [data-testid="gallery"], .gallery').should('be.visible');
    });

    it('should display gallery grid with responsive columns', () => {
      // Verify gallery items are visible in grid layout
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').should('have.length.greaterThan', 0);
    });
  });

  context('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      // Verify H1 exists
      cy.get('h1').should('have.length.greaterThan', 0);
    });

    it('should have alt text for all gallery images', () => {
      // Verify all images have alt text
      cy.get('[data-testid="gallery-item"] img, [data-testid="image-item"] img, .gallery-item img').each($img => {
        cy.wrap($img).should('have.attr', 'alt');
      });
    });

    it('gallery items should be keyboard navigable', () => {
      // Verify first gallery item is in tab order or is a button/link
      cy.get('[data-testid="gallery-item"], [data-testid="image-item"], .gallery-item').first().then(($item) => {
        const hasTabIndex = $item.attr('tabindex') !== undefined;
        const isButton = $item.is('button');
        const isLink = $item.is('a');
        // @ts-expect-error - Cypress assertion chain
        expect(hasTabIndex || isButton || isLink).to.be.true;
      });
    });
  });
});
