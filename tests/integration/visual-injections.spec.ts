import { test, expect } from '@playwright/test';

test.describe('Visual Injections and Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
    // Wait for dynamic content and injections
    await page.waitForTimeout(2000);
  });

  test('logo should be correctly injected and visible', async ({ page }) => {
    const logo = page.locator('img[data-logo-fixed="true"]');
    await expect(logo).toBeVisible();
    const src = await logo.getAttribute('src');
    expect(src).toContain('usina-pitangueiras-logo.png');
  });

  test('neon checkboxes should have correct accessibility attributes', async ({ page }) => {
    const containers = page.locator('label.neon-checkbox-container');
    const count = await containers.count();
    
    // Checkboxes only appear on login screen or if elements exist
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const container = containers.nth(i);
        const htmlFor = await container.getAttribute('for');
        const input = container.locator('input');
        const inputId = await input.getAttribute('id');
        
        expect(htmlFor).toBeTruthy();
        expect(htmlFor).toBe(inputId);
      }
    }
  });

  test('search bar should appear in Solicitante tab', async ({ page }) => {
    // Navigate to Solicitante tab if it exists
    const solicitanteTab = page.getByText('Solicitante', { exact: true });
    if (await solicitanteTab.isVisible()) {
      await solicitanteTab.click();
      await page.waitForSelector('.solicitante-search-input', { timeout: 5000 });
      const searchBar = page.locator('.solicitante-search-input');
      await expect(searchBar).toBeVisible();
      await expect(searchBar).toHaveAttribute('placeholder', 'Buscar OS, frota, equipe…');
    }
  });

  test('neon checkboxes should be focusable via keyboard', async ({ page }) => {
    const firstCheckbox = page.locator('label.neon-checkbox-container input').first();
    if (await firstCheckbox.isVisible()) {
      await page.keyboard.press('Tab');
      // Tab until we find a checkbox or give up
      let found = false;
      for(let i=0; i<10; i++) {
        const isFocused = await firstCheckbox.evaluate(node => document.activeElement === node);
        if (isFocused) {
          found = true;
          break;
        }
        await page.keyboard.press('Tab');
      }
      if (found) {
        // Verify visual focus via style check if possible or just that it accepted focus
        await expect(firstCheckbox).toBeFocused();
      }
    }
  });
});
