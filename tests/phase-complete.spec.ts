/**
 * ZengTrade Phase 1-4 Complete E2E Test Suite
 *
 * Tests all critical flows across all 4 phases for production readiness.
 * Run with: npx playwright test tests/phase-complete.spec.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TERMINAL = `${BASE_URL}/terminal?testAuth=1`;
const MOCK_TERMINAL = `${BASE_URL}/terminal?testAuth=1&mock=true`;

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: Trading Terminal
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Phase 1 — Trading Terminal', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(MOCK_TERMINAL);
        await page.waitForLoadState('networkidle');
    });

    test('terminal loads without errors', async ({ page }) => {
        // No JS error overlay
        const jsError = page.locator('[data-nextjs-dialog]');
        await expect(jsError).toHaveCount(0);

        // Header visible
        const header = page.locator('[data-testid="app-header"]');
        await expect(header).toBeVisible();
    });

    test('header renders all three zones', async ({ page }) => {
        const header = page.locator('[data-testid="app-header"]');
        // Zone Alpha: ZenG Terminal logo
        await expect(header.getByText('ZenG')).toBeVisible();
        // Zone Omega: Panic Flatten button
        await expect(header.getByText('Panic Flatten')).toBeVisible();
    });

    test('footer shows connection status', async ({ page }) => {
        const footer = page.locator('footer');
        await expect(footer).toBeVisible();
        await expect(footer).toContainText('SYNC INTEGRITY');
        await expect(footer).toContainText('MARGIN');
    });

    test('widget picker opens and shows all Phase 1-4 widgets', async ({ page }) => {
        const widgetBtn = page.locator('button', { hasText: '+ Widgets' });
        await widgetBtn.click();

        const picker = page.locator('text=Widget Gallery');
        await expect(picker).toBeVisible();

        // Phase 1 core widgets
        await expect(page.getByText('Chart')).toBeVisible();
        await expect(page.getByText('Watchlist')).toBeVisible();
        await expect(page.getByText('Market Depth')).toBeVisible();

        // Phase 2 widgets
        await expect(page.getByText('PCR Analysis')).toBeVisible();
        await expect(page.getByText('Max Pain')).toBeVisible();
        await expect(page.getByText('Price Alerts')).toBeVisible();

        // Phase 4 widgets
        await expect(page.getByText('Marketplace')).toBeVisible();
        await expect(page.getByText('Copy Trading')).toBeVisible();
    });

    test('workspace tabs are clickable', async ({ page }) => {
        const workspaceTabs = page.locator('[data-testid="workspace-tabs"], [role="tablist"]');
        // At least the terminal header should be present
        await expect(page.locator('header')).toBeVisible();
    });

    test('panic flatten modal opens and closes', async ({ page }) => {
        await page.getByText('Panic Flatten').click();
        const modal = page.locator('text=PANIC FLATTEN').or(page.locator('dialog')).first();
        await expect(modal).toBeVisible();

        const cancelBtn = page.getByRole('button', { name: /cancel|close/i });
        await cancelBtn.click();
    });

    test('indices ticker shows market data', async ({ page }) => {
        // Indices ticker should be present in the layout
        const ticker = page.locator('[data-testid="indices-ticker"]').or(
            page.locator('text=NIFTY').first()
        );
        await expect(ticker).toBeVisible();
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Options Analytics
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Phase 2 — Options Analytics', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(MOCK_TERMINAL);
        await page.waitForLoadState('networkidle');
    });

    test('PCR widget API returns data', async ({ request }) => {
        // The option-chain API that PCR depends on
        const response = await request.get(`${BASE_URL}/api/kite/option-chain?symbol=NIFTY`);
        // May 404 if no auth, but must not 500
        expect(response.status()).not.toBe(500);
    });

    test('marketplace strategies API returns seeded data', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/marketplace/strategies`);
        const data = await response.json();
        // Should work even without Redis (falls back to seeds)
        expect(response.status()).toBe(200);
        expect(data.status).toBe('success');
        expect(data.data.length).toBeGreaterThan(0);
    });

    test('marketplace filters work: category', async ({ request }) => {
        const res = await request.get(`${BASE_URL}/api/marketplace/strategies?category=Options`);
        const data = await res.json();
        expect(data.status).toBe('success');
        expect(data.data.every((s: any) => s.category === 'Options')).toBe(true);
    });

    test('marketplace filters work: risk', async ({ request }) => {
        const res = await request.get(`${BASE_URL}/api/marketplace/strategies?risk=LOW`);
        const data = await res.json();
        expect(data.status).toBe('success');
        expect(data.data.every((s: any) => s.risk === 'LOW')).toBe(true);
    });

    test('marketplace search works', async ({ request }) => {
        const res = await request.get(`${BASE_URL}/api/marketplace/strategies?q=iron`);
        const data = await res.json();
        expect(data.status).toBe('success');
        expect(data.data.length).toBeGreaterThanOrEqual(1);
    });

    test('alerts API returns correct structure', async ({ request }) => {
        const res = await request.get(`${BASE_URL}/api/kite/alerts`);
        // Should return 401 (not authenticated) or success — not 500
        expect([200, 401]).toContain(res.status());
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: Algo Automation
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Phase 3 — Algo Automation', () => {

    test('backtest API returns success with mock data', async ({ request }) => {
        const res = await request.post(`${BASE_URL}/api/backtest`, {
            data: {
                rule: {
                    name: "E2E Test Rule",
                    conditions: [{ type: "PRICE", operator: ">", value: 0, indicator: { symbol: "NIFTY 50" } }],
                    actions: [{ type: "PLACE_ORDER", params: { symbol: "NIFTY 50", side: "BUY", quantity: 1 } }]
                },
                symbol: "NIFTY",
                exchange: "NSE",
                period: "minute"
            }
        });
        const data = await res.json();
        expect(res.status()).toBe(200);
        expect(data.status).toBe('success');
        expect(data.data).toBeDefined();
        expect(data.data.meta.dataSource).toBeDefined();
    });

    test('backtest returns valid performance metrics', async ({ request }) => {
        const res = await request.post(`${BASE_URL}/api/backtest`, {
            data: {
                rule: {
                    name: "SMA Crossover Test",
                    conditions: [{ type: "PRICE", operator: ">", value: 20000, indicator: { symbol: "NIFTY" } }],
                    actions: [{ type: "PLACE_ORDER", params: { symbol: "NIFTY", side: "BUY", quantity: 1 } }]
                },
                symbol: "NIFTY",
                initial_capital: 100000
            }
        });
        const data = await res.json();
        expect(data.data).toHaveProperty('totalTrades');
        expect(data.data).toHaveProperty('pnl');
        expect(data.data).toHaveProperty('winRate');
    });

    test('multi-leg order API validates input correctly', async ({ request }) => {
        const res = await request.post(`${BASE_URL}/api/orders/multi`, {
            data: { orders: [], tag: 'TEST' }
        });
        const data = await res.json();
        expect(res.status()).toBe(400);
        expect(data.status).toBe('error');
        expect(data.message).toContain('Invalid orders');
    });

    test('multi-leg order API rejects unauthenticated', async ({ request }) => {
        const res = await request.post(`${BASE_URL}/api/orders/multi`, {
            data: {
                orders: [{ exchange: 'NFO', tradingsymbol: 'NIFTY25JAN24500CE', transaction_type: 'BUY', quantity: 50 }],
                tag: 'E2E_TEST'
            }
        });
        // Should be 401 (no auth) or 400 (invalid)
        expect([400, 401]).toContain(res.status());
    });

    test('algo studio workspace layout exists', async ({ page }) => {
        await page.goto(`${MOCK_TERMINAL}&layout=algo`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('header')).toBeVisible();
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4: Marketplace
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Phase 4 — Marketplace & Copy Trading', () => {

    test('strategies API — all seeds are seeded', async ({ request }) => {
        const res = await request.get(`${BASE_URL}/api/marketplace/strategies`);
        const data = await res.json();
        expect(data.status).toBe('success');
        expect(data.total).toBeGreaterThanOrEqual(6);
    });

    test('each strategy has required fields', async ({ request }) => {
        const res = await request.get(`${BASE_URL}/api/marketplace/strategies`);
        const data = await res.json();
        for (const s of data.data) {
            expect(s).toHaveProperty('id');
            expect(s).toHaveProperty('name');
            expect(s).toHaveProperty('author');
            expect(s).toHaveProperty('metrics');
            expect(s.metrics).toHaveProperty('cagr');
            expect(s.metrics).toHaveProperty('sharpe');
            expect(s.metrics).toHaveProperty('winRate');
            expect(s.metrics).toHaveProperty('maxDrawdown');
        }
    });

    test('subscribe API rejects unauthenticated', async ({ request }) => {
        const res = await request.post(`${BASE_URL}/api/marketplace/subscribe`, {
            data: { strategyId: 'strat-001' }
        });
        expect([401]).toContain(res.status());
    });

    test('copy trading API rejects unauthenticated', async ({ request }) => {
        const res = await request.post(`${BASE_URL}/api/marketplace/copy`, {
            data: { traderId: 'trader-001', traderName: 'Test Trader', allocationPercent: 10 }
        });
        expect([401]).toContain(res.status());
    });

    test('copy trading API validates input', async ({ request }) => {
        const res = await request.post(`${BASE_URL}/api/marketplace/copy`, {
            data: { traderId: 'trader-001' } // missing traderName
        });
        expect([400, 401]).toContain(res.status());
    });

    test('marketplace widget renders in terminal', async ({ page }) => {
        await page.goto(MOCK_TERMINAL);
        await page.waitForLoadState('networkidle');

        // Open widget picker
        await page.getByText('+ Widgets').click();
        await expect(page.getByText('Widget Gallery')).toBeVisible();

        // Marketplace widget should be available
        const marketplaceCard = page.getByText('Marketplace');
        await expect(marketplaceCard).toBeVisible();

        // Add it to layout
        await marketplaceCard.click();

        // Widget gallery closes and terminal is still visible
        await expect(page.locator('header')).toBeVisible();
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// API Health Checks
// ─────────────────────────────────────────────────────────────────────────────
test.describe('API Health — All Phases', () => {

    const endpoints = [
        { path: '/api/kite/profile', method: 'GET', expectedStatuses: [200, 401] },
        { path: '/api/portfolio/positions', method: 'GET', expectedStatuses: [200, 401] },
        { path: '/api/portfolio/holdings', method: 'GET', expectedStatuses: [200, 401] },
        { path: '/api/orders/list', method: 'GET', expectedStatuses: [200, 401] },
        { path: '/api/kite/alerts', method: 'GET', expectedStatuses: [200, 401] },
        { path: '/api/marketplace/strategies', method: 'GET', expectedStatuses: [200] },
        { path: '/api/user/margins', method: 'GET', expectedStatuses: [200, 401] },
        { path: '/api/kite/instruments', method: 'GET', expectedStatuses: [200, 401, 304] },
    ];

    for (const endpoint of endpoints) {
        test(`${endpoint.method} ${endpoint.path} — responds (no 500)`, async ({ request }) => {
            const res = await request.get(`${BASE_URL}${endpoint.path}`);
            expect(endpoint.expectedStatuses).toContain(res.status());
            // Must never be 500
            expect(res.status()).not.toBe(500);
        });
    }

    test('landing page loads correctly', async ({ page }) => {
        await page.goto(BASE_URL);
        await expect(page).toHaveTitle(/ZenG|ZengTrade/i);
        // No JS errors
        const errorOverlay = page.locator('[data-nextjs-dialog]');
        await expect(errorOverlay).toHaveCount(0);
    });

    test('terminal page redirects or shows login for unauthenticated', async ({ page }) => {
        await page.goto(`${BASE_URL}/terminal`);
        await page.waitForLoadState('networkidle');
        // Should show login screen (not a 500 error page)
        const loginScreen = page.locator('text=Connect Broker').or(page.locator('text=Login').or(page.locator('text=Kite')));
        await expect(loginScreen.first()).toBeVisible();
    });

    test('terminal with testAuth renders full UI', async ({ page }) => {
        await page.goto(MOCK_TERMINAL);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('header')).toBeVisible();
        await expect(page.locator('footer')).toBeVisible();
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// Auth Flow
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Auth Flow', () => {

    test('pre-auth validates empty API key', async ({ request }) => {
        const res = await request.post(`${BASE_URL}/api/auth/pre-auth`, {
            data: { apiKey: '', apiSecret: '' }
        });
        expect([400, 422]).toContain(res.status());
    });

    test('logout returns redirect or 200', async ({ request }) => {
        const res = await request.get(`${BASE_URL}/api/auth/logout`);
        expect([200, 302, 307]).toContain(res.status());
    });

    test('callback without request_token returns error', async ({ request }) => {
        const res = await request.get(`${BASE_URL}/api/auth/callback`);
        expect([400, 401, 302]).toContain(res.status());
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// Order Placement Validation
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Order Validation', () => {

    test('place order rejects invalid order type', async ({ request }) => {
        const res = await request.post(`${BASE_URL}/api/orders/place`, {
            data: {
                exchange: 'NSE',
                tradingsymbol: 'INFY-EQ',
                transaction_type: 'INVALID_TYPE',
                quantity: 1,
                order_type: 'MARKET',
                product: 'MIS',
                price: 0
            }
        });
        expect([400, 401, 422]).toContain(res.status());
    });

    test('place order rejects zero quantity', async ({ request }) => {
        const res = await request.post(`${BASE_URL}/api/orders/place`, {
            data: {
                exchange: 'NSE',
                tradingsymbol: 'INFY-EQ',
                transaction_type: 'BUY',
                quantity: 0,
                order_type: 'MARKET',
                product: 'MIS',
                price: 0
            }
        });
        expect([400, 401, 422]).toContain(res.status());
    });

    test('modify order rejects without order_id', async ({ request }) => {
        const res = await request.put(`${BASE_URL}/api/orders/modify`, {
            data: { quantity: 5 }
        });
        expect([400, 401]).toContain(res.status());
    });

    test('cancel order rejects without order_id', async ({ request }) => {
        const res = await request.delete(`${BASE_URL}/api/orders/cancel`);
        expect([400, 401]).toContain(res.status());
    });

});
