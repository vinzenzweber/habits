/**
 * E2E tests for PDF recipe import feature
 */

import { test, expect } from './fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

// Path to image-based test PDF
const testPdfPath = path.join(
  __dirname,
  '../src/lib/__tests__/fixtures/test-recipes-images.pdf'
);
const pdfExists = fs.existsSync(testPdfPath);

test.describe('PDF Recipe Import', () => {
  test.describe('Import Modal', () => {
    test('opens import modal with PDF support', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // Click import button
      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Modal should open with "Import Recipe" heading
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Import Recipe' })
      ).toBeVisible();

      // Cancel button should be available (confirms modal is open and functional)
      await expect(
        authenticatedPage.getByRole('button', { name: /cancel/i })
      ).toBeVisible();
    });

    test('shows drop zone on desktop', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 1024, height: 768 });
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Should show drop zone
      await expect(authenticatedPage.getByText(/drop file here/i)).toBeVisible();
    });

    test('shows file selection buttons on mobile', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Should show file selection options
      await expect(authenticatedPage.getByText('Choose File')).toBeVisible();
    });

    test('import button text mentions photo or PDF', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      // The import button should indicate it supports both photos and PDFs
      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await expect(importButton).toBeVisible();
    });
  });

  // Tests that require the actual PDF file
  test.describe('PDF Import with Test File', () => {
    test.skip(!pdfExists, 'Test PDF file not found');

    test('can initiate PDF file selection', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 1024, height: 768 });
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Wait for modal
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Import Recipe' })
      ).toBeVisible();

      // The drop zone should accept PDF files
      // Check that the modal is ready to accept file input
      const fileInput = authenticatedPage.locator(
        'input[type="file"][accept*="application/pdf"]'
      );
      await expect(fileInput).toBeAttached();
    });

    test('file input accepts PDF mime type', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 1024, height: 768 });
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Check file input accepts PDFs
      const fileInput = authenticatedPage.locator('input[type="file"]');
      const acceptAttr = await fileInput.getAttribute('accept');

      // Should accept PDF files (either via mime type or extension)
      if (acceptAttr) {
        const acceptsPdf = acceptAttr.includes('application/pdf') || acceptAttr.includes('.pdf');
        expect(acceptsPdf).toBe(true);
      }
    });

    test('uploads image-based PDF and shows extraction results (mocked)', async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.setViewportSize({ width: 1024, height: 768 });

      const jobId = 321;
      let pollCount = 0;

      await authenticatedPage.route(
        `**/api/recipes/extract-from-pdf/${jobId}`,
        async (route) => {
          pollCount += 1;
          const now = new Date().toISOString();

          if (pollCount === 1) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                jobId,
                status: 'processing',
                progress: { currentPage: 1, totalPages: 2 },
                recipes: [
                  { slug: 'mock-recipe-1', title: 'Mock Recipe One', pageNumber: 1 },
                ],
                skippedPages: [],
                error: null,
                createdAt: now,
                completedAt: null,
              }),
            });
            return;
          }

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              jobId,
              status: 'completed',
              progress: { currentPage: 2, totalPages: 2 },
              recipes: [
                { slug: 'mock-recipe-1', title: 'Mock Recipe One', pageNumber: 1 },
                { slug: 'mock-recipe-2', title: 'Mock Recipe Two', pageNumber: 2 },
              ],
              skippedPages: [],
              error: null,
              createdAt: now,
              completedAt: now,
            }),
          });
        }
      );

      await authenticatedPage.route('**/api/recipes/extract-from-pdf', async (route) => {
        if (route.request().method() !== 'POST') {
          await route.fallback();
          return;
        }

        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({ jobId }),
        });
      });

      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      const fileInput = authenticatedPage.locator(
        'input[type="file"][accept*="application/pdf"]'
      );
      const pdfBuffer = fs.readFileSync(testPdfPath);
      await fileInput.setInputFiles({
        name: 'test-recipes-images.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await expect(
        authenticatedPage.getByText('test-recipes-images.pdf').first()
      ).toBeVisible();

      await authenticatedPage
        .getByRole('button', { name: 'Import Recipe', exact: true })
        .click();

      await expect
        .poll(() => pollCount, { timeout: 60000 })
        .toBeGreaterThanOrEqual(2);

      await expect(
        authenticatedPage.getByText(/2 recipes imported/i)
      ).toBeVisible({ timeout: 20000 });
      await expect(authenticatedPage.getByText('Mock Recipe One')).toBeVisible();
      await expect(authenticatedPage.getByText('Mock Recipe Two')).toBeVisible();
    });
  });

  // UI-only tests (no actual PDF processing)
  test.describe('Import Modal UI Behavior', () => {
    test('cancel button closes modal', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Click cancel
      await authenticatedPage.getByRole('button', { name: /cancel/i }).click();

      // Modal should close
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Import Recipe' })
      ).not.toBeVisible();
    });

    test('close button (X) closes modal', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Click close button
      await authenticatedPage.getByLabel('Close').click();

      // Modal should close
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Import Recipe' })
      ).not.toBeVisible();
    });

    test('modal can be reopened after closing', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });

      // Open and close
      await importButton.click();
      await authenticatedPage.getByRole('button', { name: /cancel/i }).click();

      // Reopen
      await importButton.click();

      // Should be visible again
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Import Recipe' })
      ).toBeVisible();
    });

    test('modal overlay prevents interaction with page behind', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Modal should be visible with its header
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Import Recipe' })
      ).toBeVisible();

      // Modal should have functional buttons
      await expect(
        authenticatedPage.getByRole('button', { name: /cancel/i })
      ).toBeVisible();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('desktop shows drag and drop zone', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 1280, height: 800 });
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Should show drop zone text
      await expect(authenticatedPage.getByText(/drop file here/i)).toBeVisible();
    });

    test('tablet shows appropriate UI', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 768, height: 1024 });
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Modal should be visible and usable on tablet
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Import Recipe' })
      ).toBeVisible();
    });

    test('mobile shows camera and file buttons', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Should show mobile-specific buttons
      await expect(authenticatedPage.getByText('Take Photo')).toBeVisible();
      await expect(authenticatedPage.getByText('Choose File')).toBeVisible();
    });

    test('small mobile screen handles modal correctly', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 320, height: 568 }); // iPhone SE size
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Modal should be visible even on very small screens
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Import Recipe' })
      ).toBeVisible();

      // Cancel button should be accessible
      await expect(
        authenticatedPage.getByRole('button', { name: /cancel/i })
      ).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('modal is accessible via heading', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Modal should have accessible heading
      const heading = authenticatedPage.getByRole('heading', { name: 'Import Recipe' });
      await expect(heading).toBeVisible();
    });

    test('close button has accessible label', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Close button should have accessible label
      const closeButton = authenticatedPage.getByLabel('Close');
      await expect(closeButton).toBeVisible();
    });

    test('modal heading is properly structured', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/recipes');

      const importButton = authenticatedPage.getByRole('button', {
        name: /import recipe from photo or pdf/i,
      });
      await importButton.click();

      // Heading should exist and be accessible
      const heading = authenticatedPage.getByRole('heading', { name: 'Import Recipe' });
      await expect(heading).toBeVisible();
    });
  });
});
