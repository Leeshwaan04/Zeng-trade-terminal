import { test, expect } from '@playwright/test';

test.describe('Multi-Broker Switching Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Use testAuth=1 to bypass real login and mock=true for internal data
        await page.goto('http://localhost:3000?testAuth=1&mock=true');
    });

    test('should switch from Kite to Groww and update identity', async ({ page }) => {
        // 1. Open Profile Menu
        const profileBtn = page.locator('button').filter({ hasText: /^CY$|^PT$/i }).first();
        await profileBtn.click();

        // 2. Click Groww Trade
        const growwBtn = page.locator('button', { hasText: 'Groww Trade' });
        await growwBtn.click();

        // 3. Reopen Profile Menu (in case it closed or just to verify)
        await profileBtn.click();

        // 4. Verify Identity Change (Mock Groww User)
        // This confirms setGrowwSession was called and state updated
        await expect(page.locator('text=Mock Groww')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=mock@groww.io')).toBeVisible();

        // 5. Check active state highlighting
        await expect(page.locator('button', { hasText: 'Groww Trade' })).toHaveClass(/text-groww/);
    });

    test('should switch back to Kite', async ({ page }) => {
        // 1. Open Profile Menu
        const profileBtn = page.locator('button').filter({ hasText: /^CY$|^PT$/i }).first();
        await profileBtn.click();

        // 2. Click Groww first to establish state
        const growwBtn = page.locator('button', { hasText: 'Groww Trade' });
        await growwBtn.click();

        // 3. Open again and switch back to Kite
        await profileBtn.click();
        const kiteBtn = page.locator('button', { hasText: 'Kite Zerodha' });
        await kiteBtn.click();

        // 4. Verify Kite is active
        await profileBtn.click();
        await expect(page.locator('button', { hasText: 'Kite Zerodha' })).toHaveClass(/text-primary/);
    });
});
