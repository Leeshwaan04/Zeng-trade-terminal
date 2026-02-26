import { test, expect } from '@playwright/test';

test.describe('Groww 915 Parity Features', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/?testAuth=1&mock=true&layout=915-advanced');
        // Wait for the app to be ready
        await page.waitForSelector('[data-testid="watchlist-widget"]');
    });

    test('Customizable Ticker Bar renders and can be configured', async ({ page }) => {
        // Check if the ticker is present
        const ticker = page.locator('[data-testid="indices-ticker"]');
        await expect(ticker).toBeVisible();

        // Hover to reveal settings
        await ticker.hover();

        // Click the settings button
        const settingsBtn = page.locator('[data-testid="indices-ticker"] button');
        await expect(settingsBtn).toBeVisible();
        await settingsBtn.click();

        // Verify popover opens
        const popover = page.locator('[role="dialog"]');
        await expect(popover).toBeVisible();
        await expect(popover.getByText('Edit Columns')).toBeVisible();
        await expect(popover.getByText('Ticker Speed')).toBeVisible();
    });

    test('Widget Color Linking dropdown appears on Widget Header', async ({ page }) => {
        // Find the Market Depth widget header which has the color linking dropdown
        const depthWidget = page.locator('div.flex-col', { hasText: 'MARKET DEPTH' }).first();
        await expect(depthWidget).toBeVisible();

        // The ... menu button
        const moreBtn = depthWidget.locator('[data-testid="color-link-trigger"]').first();
        await expect(moreBtn).toBeVisible();
        await moreBtn.click();

        // Verify color options appear
        const menu = page.locator('[role="menu"]');
        await expect(menu).toBeVisible();
        await expect(menu.getByText('Link Color')).toBeVisible();
        await expect(menu.getByText('Blue')).toBeVisible();
        await expect(menu.getByText('Orange')).toBeVisible();
    });
});
