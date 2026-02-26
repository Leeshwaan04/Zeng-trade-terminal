import { test, expect } from '@playwright/test';

test.describe('Groww 915 UI density verification', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000?testAuth=1');
    });

    test('initial load and background color', async ({ page }) => {
        // Ensure no runtime error overlay
        const errorOverlay = page.locator('text=Error');
        await expect(errorOverlay).toHaveCount(0);
        // Check background color of body
        const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        // Expect near‑black (#111318) which is rgb(17,19,24)
        expect(bg).toBe('rgb(17, 19, 24)');
    });

    test('header layout', async ({ page }) => {
        const header = page.locator('[data-testid="app-header"]');
        await expect(header).toBeVisible();
        // Height approx 44px
        const height = await header.evaluate(el => getComputedStyle(el).height);
        expect(parseFloat(height)).toBeCloseTo(44, 2);
        // Logo text is split for density
        await expect(header.locator('text=CYBER')).toBeVisible();
        await expect(header.locator('text=TRADE')).toBeVisible();
        // Flat underline tabs exist
        const tabsCount = await header.locator('.group').count();
        expect(tabsCount).toBeGreaterThan(0);
        // Ensure no pill style class
        const firstTab = header.locator('.group').first();
        await expect(firstTab).not.toHaveClass(/rounded-full/);
    });

    test('indices ticker', async ({ page }) => {
        const ticker = page.locator('[data-testid="indices-ticker"]');
        await expect(ticker).toBeVisible();
        // Index symbols are shortened for density
        await expect(ticker.locator('text=BANK')).toBeVisible();
        await expect(ticker.locator('text=SENSEX')).toBeVisible();
        await expect(ticker.locator('text=VIX')).toBeVisible();
        // Hover
        await ticker.hover();
    });

    test('watchlist widget density', async ({ page }) => {
        const watchlist = page.locator('[data-testid="watchlist-widget"]');
        await expect(watchlist).toBeVisible();
        // Column headers - Instrument, LTP, Chg%
        await expect(watchlist).toContainText('Instrument');
        await expect(watchlist).toContainText('LTP');
        await expect(watchlist).toContainText('Chg%');

        // Compact rows: check row height via padding/gap if needed or just visual confirmation
        const firstRow = watchlist.locator('.group').first();
        await expect(firstRow).toBeVisible();

        // Hover shows buy/sell buttons
        await firstRow.hover();
        const buyBtn = watchlist.locator('button', { hasText: 'B' }).first();
        const sellBtn = watchlist.locator('button', { hasText: 'S' }).first();
        await expect(buyBtn).toBeVisible({ timeout: 3000 });
        await expect(sellBtn).toBeVisible({ timeout: 3000 });
    });
});
