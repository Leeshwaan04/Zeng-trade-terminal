-- ============================================================
-- ZengTrade PostgreSQL Schema
-- Production-grade schema for a polyglot trading platform
-- PostgreSQL 16+ with partitioning, JSONB, UUID, and timescale-
-- compatible patterns.
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy search on symbols/names
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- exclusion constraints on ranges

-- ─── Schema ───────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS trading;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS strategy;
CREATE SCHEMA IF NOT EXISTS risk;
CREATE SCHEMA IF NOT EXISTS audit;

SET search_path = trading, public;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 1 — USERS & IDENTITY                               ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT UNIQUE,
    display_name    TEXT NOT NULL,
    avatar_url      TEXT,
    timezone        TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    locale          TEXT NOT NULL DEFAULT 'en-IN',
    plan            TEXT NOT NULL DEFAULT 'free'    -- free | pro | elite | enterprise
                    CHECK (plan IN ('free','pro','elite','enterprise')),
    plan_expires_at TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- ─── User Preferences (one row per user) ──────────────────────
CREATE TABLE user_preferences (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme               TEXT NOT NULL DEFAULT 'dark',
    default_broker      TEXT NOT NULL DEFAULT 'KITE',
    default_exchange    TEXT NOT NULL DEFAULT 'NSE',
    order_confirm       BOOLEAN NOT NULL DEFAULT TRUE,   -- show confirm before placing
    panic_countdown_ms  INT NOT NULL DEFAULT 3000,
    sound_alerts        BOOLEAN NOT NULL DEFAULT TRUE,
    chart_type          TEXT NOT NULL DEFAULT 'candlestick',
    default_timeframe   TEXT NOT NULL DEFAULT '5m',
    risk_per_trade_pct  NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    max_daily_loss_pct  NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    shortcut_overrides  JSONB NOT NULL DEFAULT '{}',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── User Sessions (auth tokens) ──────────────────────────────
CREATE TABLE user_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,               -- SHA-256 of the session token
    ip_address  INET,
    user_agent  TEXT,
    last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON user_sessions(token_hash);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 2 — BROKER CONNECTIONS                             ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE broker_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    broker          TEXT NOT NULL                  -- KITE | DHAN | FYERS | GROWW | ANGEL
                    CHECK (broker IN ('KITE','DHAN','FYERS','GROWW','ANGEL','ZERODHA_COIN')),
    client_id       TEXT NOT NULL,
    display_name    TEXT,
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, broker, client_id)
);

CREATE INDEX idx_broker_accounts_user ON broker_accounts(user_id);

-- ─── Broker Tokens (encrypted, rotated daily) ─────────────────
CREATE TABLE broker_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_account_id UUID NOT NULL REFERENCES broker_accounts(id) ON DELETE CASCADE,
    access_token    BYTEA NOT NULL,                -- AES-256-GCM encrypted
    refresh_token   BYTEA,
    api_key         BYTEA NOT NULL,
    api_secret      BYTEA NOT NULL,
    token_type      TEXT NOT NULL DEFAULT 'bearer',
    scopes          TEXT[],
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broker_tokens_account ON broker_tokens(broker_account_id);
CREATE INDEX idx_broker_tokens_expires ON broker_tokens(expires_at) WHERE revoked_at IS NULL;

-- ─── Broker Health / Connection State ─────────────────────────
CREATE TABLE broker_connection_status (
    broker_account_id UUID PRIMARY KEY REFERENCES broker_accounts(id) ON DELETE CASCADE,
    ws_connected      BOOLEAN NOT NULL DEFAULT FALSE,
    last_heartbeat    TIMESTAMPTZ,
    reconnect_count   INT NOT NULL DEFAULT 0,
    last_error        TEXT,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 3 — INSTRUMENTS & MARKET REFERENCE DATA           ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE instruments (
    id                  BIGSERIAL PRIMARY KEY,
    instrument_token    BIGINT NOT NULL,
    tradingsymbol       TEXT NOT NULL,
    exchange_token      BIGINT,
    name                TEXT,
    last_price          NUMERIC(16,4),
    expiry              DATE,
    strike              NUMERIC(16,2),
    tick_size           NUMERIC(10,4),
    lot_size            INT NOT NULL DEFAULT 1,
    instrument_type     TEXT,       -- EQ | FUT | CE | PE | INDEX
    segment             TEXT,       -- NSE | BSE | NFO | BFO | MCX | CDS
    exchange            TEXT NOT NULL,
    isin                TEXT,
    category            TEXT,       -- index | stock | option | future | commodity
    is_tradable         BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at          DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (exchange, tradingsymbol)
);

CREATE INDEX idx_instruments_token ON instruments(instrument_token);
CREATE INDEX idx_instruments_symbol ON instruments USING gin(tradingsymbol gin_trgm_ops);
CREATE INDEX idx_instruments_exchange ON instruments(exchange, segment);
CREATE INDEX idx_instruments_expiry ON instruments(expiry) WHERE expiry IS NOT NULL;

-- ─── Option Chain Metadata ─────────────────────────────────────
CREATE TABLE option_chains (
    id              BIGSERIAL PRIMARY KEY,
    underlying      TEXT NOT NULL,      -- NIFTY | BANKNIFTY | FINNIFTY | etc.
    expiry          DATE NOT NULL,
    expiry_type     TEXT NOT NULL,      -- weekly | monthly
    strike_count    INT,
    atm_strike      NUMERIC(10,2),
    refreshed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (underlying, expiry)
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 4 — WATCHLISTS                                     ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE watchlists (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    color       TEXT,
    icon        TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_watchlists_user ON watchlists(user_id);

CREATE TABLE watchlist_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    watchlist_id    UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    tradingsymbol   TEXT NOT NULL,
    exchange        TEXT NOT NULL DEFAULT 'NSE',
    instrument_token BIGINT,
    display_name    TEXT,
    alert_above     NUMERIC(16,4),
    alert_below     NUMERIC(16,4),
    notes           TEXT,
    sort_order      INT NOT NULL DEFAULT 0,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (watchlist_id, exchange, tradingsymbol)
);

CREATE INDEX idx_watchlist_items_list ON watchlist_items(watchlist_id);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 5 — ORDERS                                         ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id),
    broker_account_id   UUID NOT NULL REFERENCES broker_accounts(id),
    broker_order_id     TEXT,           -- Kite/Dhan order ID
    parent_order_id     UUID REFERENCES orders(id),     -- for bracket/cover legs
    tradingsymbol       TEXT NOT NULL,
    exchange            TEXT NOT NULL,
    instrument_token    BIGINT,
    transaction_type    TEXT NOT NULL CHECK (transaction_type IN ('BUY','SELL')),
    product             TEXT NOT NULL   -- MIS | CNC | NRML | BO | CO
                        CHECK (product IN ('MIS','CNC','NRML','BO','CO')),
    order_type          TEXT NOT NULL   -- MARKET | LIMIT | SL | SL-M
                        CHECK (order_type IN ('MARKET','LIMIT','SL','SL-M')),
    validity            TEXT NOT NULL DEFAULT 'DAY'
                        CHECK (validity IN ('DAY','IOC','TTL')),
    quantity            INT NOT NULL CHECK (quantity > 0),
    pending_quantity    INT NOT NULL DEFAULT 0,
    filled_quantity     INT NOT NULL DEFAULT 0,
    cancelled_quantity  INT NOT NULL DEFAULT 0,
    price               NUMERIC(16,4) NOT NULL DEFAULT 0,
    trigger_price       NUMERIC(16,4),
    average_price       NUMERIC(16,4),
    disclosed_quantity  INT,
    status              TEXT NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN','COMPLETE','CANCELLED','REJECTED','PENDING','TRIGGER_PENDING')),
    status_message      TEXT,
    tag                 TEXT,           -- strategy tag or custom label
    variety             TEXT NOT NULL DEFAULT 'regular',
    source              TEXT NOT NULL DEFAULT 'MANUAL'
                        CHECK (source IN ('MANUAL','STRATEGY','ALGO','API','BASKET')),
    strategy_id         UUID,
    placed_at           TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Monthly partitions for orders
CREATE TABLE orders_2025_q1 PARTITION OF orders FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE orders_2025_q2 PARTITION OF orders FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE orders_2025_q3 PARTITION OF orders FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE orders_2025_q4 PARTITION OF orders FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE orders_2026_q1 PARTITION OF orders FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE orders_2026_q2 PARTITION OF orders FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE orders_default  PARTITION OF orders DEFAULT;

CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_symbol ON orders(tradingsymbol, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status) WHERE status IN ('OPEN','PENDING','TRIGGER_PENDING');
CREATE INDEX idx_orders_broker_order ON orders(broker_order_id) WHERE broker_order_id IS NOT NULL;

-- ─── Trade Fills (execution reports) ──────────────────────────
CREATE TABLE trades (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID NOT NULL REFERENCES orders(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    broker_account_id   UUID NOT NULL REFERENCES broker_accounts(id),
    broker_trade_id     TEXT,
    tradingsymbol       TEXT NOT NULL,
    exchange            TEXT NOT NULL,
    transaction_type    TEXT NOT NULL CHECK (transaction_type IN ('BUY','SELL')),
    product             TEXT NOT NULL,
    quantity            INT NOT NULL,
    price               NUMERIC(16,4) NOT NULL,
    fill_timestamp      TIMESTAMPTZ NOT NULL,
    exchange_timestamp  TIMESTAMPTZ,
    order_timestamp     TIMESTAMPTZ,
    brokerage           NUMERIC(16,4),
    stt                 NUMERIC(16,4),   -- Securities Transaction Tax
    exchange_charges    NUMERIC(16,4),
    sebi_charges        NUMERIC(16,4),
    stamp_duty          NUMERIC(16,4),
    gst                 NUMERIC(16,4),
    total_charges       NUMERIC(16,4),
    net_amount          NUMERIC(16,4),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE trades_2025_q1 PARTITION OF trades FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE trades_2025_q2 PARTITION OF trades FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE trades_2025_q3 PARTITION OF trades FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE trades_2025_q4 PARTITION OF trades FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE trades_2026_q1 PARTITION OF trades FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE trades_2026_q2 PARTITION OF trades FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE trades_default  PARTITION OF trades DEFAULT;

CREATE INDEX idx_trades_order ON trades(order_id);
CREATE INDEX idx_trades_user ON trades(user_id, created_at DESC);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 6 — POSITIONS & PORTFOLIO                          ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Intraday positions (reset daily)
CREATE TABLE positions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id),
    broker_account_id   UUID NOT NULL REFERENCES broker_accounts(id),
    tradingsymbol       TEXT NOT NULL,
    exchange            TEXT NOT NULL,
    instrument_token    BIGINT,
    product             TEXT NOT NULL,
    quantity            INT NOT NULL DEFAULT 0,
    overnight_quantity  INT NOT NULL DEFAULT 0,
    multiplier          INT NOT NULL DEFAULT 1,
    average_price       NUMERIC(16,4) NOT NULL DEFAULT 0,
    close_price         NUMERIC(16,4),
    last_price          NUMERIC(16,4),
    value               NUMERIC(16,4),   -- quantity * last_price
    pnl                 NUMERIC(16,4),
    m2m                 NUMERIC(16,4),   -- mark-to-market
    unrealised_pnl      NUMERIC(16,4),
    realised_pnl        NUMERIC(16,4),
    buy_quantity        INT NOT NULL DEFAULT 0,
    buy_price           NUMERIC(16,4) NOT NULL DEFAULT 0,
    buy_value           NUMERIC(16,4) NOT NULL DEFAULT 0,
    sell_quantity       INT NOT NULL DEFAULT 0,
    sell_price          NUMERIC(16,4) NOT NULL DEFAULT 0,
    sell_value          NUMERIC(16,4) NOT NULL DEFAULT 0,
    day_buy_quantity    INT NOT NULL DEFAULT 0,
    day_buy_price       NUMERIC(16,4) NOT NULL DEFAULT 0,
    day_buy_value       NUMERIC(16,4) NOT NULL DEFAULT 0,
    day_sell_quantity   INT NOT NULL DEFAULT 0,
    day_sell_price      NUMERIC(16,4) NOT NULL DEFAULT 0,
    day_sell_value      NUMERIC(16,4) NOT NULL DEFAULT 0,
    trade_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, broker_account_id, tradingsymbol, exchange, product, trade_date)
);

CREATE INDEX idx_positions_user ON positions(user_id, trade_date);
CREATE INDEX idx_positions_open ON positions(user_id) WHERE quantity != 0;

-- Long-term holdings (NRML / CNC)
CREATE TABLE holdings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id),
    broker_account_id   UUID NOT NULL REFERENCES broker_accounts(id),
    tradingsymbol       TEXT NOT NULL,
    exchange            TEXT NOT NULL,
    isin                TEXT,
    quantity            INT NOT NULL,
    t1_quantity         INT NOT NULL DEFAULT 0,     -- shares in T+1 settlement
    realised_quantity   INT NOT NULL DEFAULT 0,
    authorised_quantity INT NOT NULL DEFAULT 0,
    average_price       NUMERIC(16,4) NOT NULL,
    last_price          NUMERIC(16,4),
    close_price         NUMERIC(16,4),
    pnl                 NUMERIC(16,4),
    day_change          NUMERIC(16,4),
    day_change_pct      NUMERIC(8,4),
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, broker_account_id, tradingsymbol, exchange)
);

CREATE INDEX idx_holdings_user ON holdings(user_id);

-- ─── Daily P&L Snapshots ───────────────────────────────────────
CREATE TABLE daily_pnl (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id),
    broker_account_id   UUID NOT NULL REFERENCES broker_accounts(id),
    trade_date          DATE NOT NULL,
    realised_pnl        NUMERIC(16,4) NOT NULL DEFAULT 0,
    unrealised_pnl      NUMERIC(16,4) NOT NULL DEFAULT 0,
    total_charges       NUMERIC(16,4) NOT NULL DEFAULT 0,
    net_pnl             NUMERIC(16,4) NOT NULL DEFAULT 0,
    gross_turnover      NUMERIC(20,4) NOT NULL DEFAULT 0,
    trade_count         INT NOT NULL DEFAULT 0,
    win_count           INT NOT NULL DEFAULT 0,
    loss_count          INT NOT NULL DEFAULT 0,
    max_drawdown        NUMERIC(16,4),
    peak_pnl            NUMERIC(16,4),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, broker_account_id, trade_date)
);

CREATE INDEX idx_daily_pnl_user ON daily_pnl(user_id, trade_date DESC);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 7 — MARGIN & FUNDS                                 ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE margin_snapshots (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_account_id   UUID NOT NULL REFERENCES broker_accounts(id) ON DELETE CASCADE,
    segment             TEXT NOT NULL DEFAULT 'equity',   -- equity | commodity | currency
    enabled_balance     NUMERIC(16,4),
    net                 NUMERIC(16,4),
    available_cash      NUMERIC(16,4),
    available_intraday  NUMERIC(16,4),
    utilised_debits     NUMERIC(16,4),
    utilised_exposure   NUMERIC(16,4),
    utilised_span       NUMERIC(16,4),
    utilised_option_premium NUMERIC(16,4),
    utilised_holding_sales  NUMERIC(16,4),
    utilised_turnover   NUMERIC(16,4),
    snapshotted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_margin_account ON margin_snapshots(broker_account_id, snapshotted_at DESC);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 8 — ALERTS                                         ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT,
    tradingsymbol   TEXT NOT NULL,
    exchange        TEXT NOT NULL,
    condition_type  TEXT NOT NULL
                    CHECK (condition_type IN (
                        'PRICE_ABOVE','PRICE_BELOW','PRICE_CROSSES',
                        'CHANGE_PCT_ABOVE','CHANGE_PCT_BELOW',
                        'VOLUME_ABOVE','OI_ABOVE',
                        'IV_ABOVE','IV_BELOW',
                        'RSI_ABOVE','RSI_BELOW',
                        'MACD_CROSSOVER','BB_BREAKOUT',
                        'CUSTOM'
                    )),
    condition_value NUMERIC(16,4),
    custom_expr     TEXT,           -- JSON/DSL for custom condition
    timeframe       TEXT,           -- for indicator alerts
    channel         TEXT[] NOT NULL DEFAULT ARRAY['IN_APP'],  -- IN_APP | PUSH | EMAIL | TELEGRAM | WEBHOOK
    webhook_url     TEXT,
    message         TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_recurring    BOOLEAN NOT NULL DEFAULT FALSE,
    triggered_count INT NOT NULL DEFAULT 0,
    last_triggered  TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_active ON alerts(tradingsymbol, exchange) WHERE is_active = TRUE;

CREATE TABLE alert_triggers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id        UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    triggered_price NUMERIC(16,4),
    triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivery_status JSONB NOT NULL DEFAULT '{}'   -- { IN_APP: "ok", EMAIL: "failed", ... }
);

CREATE INDEX idx_alert_triggers_alert ON alert_triggers(alert_id, triggered_at DESC);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 9 — STRATEGIES                                     ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE strategies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    type            TEXT NOT NULL
                    CHECK (type IN ('MANUAL','INDICATOR','OPTIONS','PAIRS','ARBITRAGE','ML','CUSTOM')),
    category        TEXT,           -- intraday | swing | scalp | positional
    universe        TEXT[],         -- ['NIFTY50', 'BANKNIFTY', 'NSE_FO']
    timeframe       TEXT NOT NULL DEFAULT '5m',
    entry_logic     JSONB NOT NULL DEFAULT '{}',  -- DSL / condition tree
    exit_logic      JSONB NOT NULL DEFAULT '{}',
    risk_params     JSONB NOT NULL DEFAULT '{}',  -- stop_loss_pct, target_pct, max_positions
    position_sizing JSONB NOT NULL DEFAULT '{}',  -- fixed | kelly | percent_equity
    broker_account_id UUID REFERENCES broker_accounts(id),
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    is_paper        BOOLEAN NOT NULL DEFAULT TRUE,
    auto_execute    BOOLEAN NOT NULL DEFAULT FALSE,
    max_positions   INT NOT NULL DEFAULT 1,
    capital_allocated NUMERIC(16,4),
    tags            TEXT[],
    version         INT NOT NULL DEFAULT 1,
    parent_id       UUID REFERENCES strategies(id),   -- for versioned forks
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strategies_user ON strategies(user_id);
CREATE INDEX idx_strategies_active ON strategies(user_id) WHERE is_active = TRUE;

-- ─── Strategy Signals ──────────────────────────────────────────
CREATE TABLE strategy_signals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id     UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    tradingsymbol   TEXT NOT NULL,
    exchange        TEXT NOT NULL,
    signal_type     TEXT NOT NULL CHECK (signal_type IN ('ENTRY','EXIT','SCALE_IN','SCALE_OUT','ALERT')),
    direction       TEXT CHECK (direction IN ('BUY','SELL')),
    timeframe       TEXT,
    price           NUMERIC(16,4),
    quantity        INT,
    confidence      NUMERIC(5,4),   -- 0.0 to 1.0
    indicators      JSONB,          -- snapshot of indicator values at signal
    order_id        UUID REFERENCES orders(id),
    executed        BOOLEAN NOT NULL DEFAULT FALSE,
    executed_at     TIMESTAMPTZ,
    fired_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (fired_at);

CREATE TABLE strategy_signals_2025_q1 PARTITION OF strategy_signals FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE strategy_signals_2025_q2 PARTITION OF strategy_signals FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE strategy_signals_2025_q3 PARTITION OF strategy_signals FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE strategy_signals_2025_q4 PARTITION OF strategy_signals FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE strategy_signals_2026_q1 PARTITION OF strategy_signals FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE strategy_signals_2026_q2 PARTITION OF strategy_signals FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE strategy_signals_default  PARTITION OF strategy_signals DEFAULT;

CREATE INDEX idx_signals_strategy ON strategy_signals(strategy_id, fired_at DESC);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 10 — BACKTESTING                                   ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE backtests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strategy_id         UUID REFERENCES strategies(id),
    name                TEXT NOT NULL,
    symbol              TEXT,
    universe            TEXT[],
    timeframe           TEXT NOT NULL,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    initial_capital     NUMERIC(16,4) NOT NULL,
    commission_pct      NUMERIC(6,4) NOT NULL DEFAULT 0.03,
    slippage_pct        NUMERIC(6,4) NOT NULL DEFAULT 0.01,
    entry_logic         JSONB NOT NULL DEFAULT '{}',
    exit_logic          JSONB NOT NULL DEFAULT '{}',
    risk_params         JSONB NOT NULL DEFAULT '{}',
    status              TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED','CANCELLED')),
    progress_pct        INT NOT NULL DEFAULT 0,
    error_message       TEXT,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backtests_user ON backtests(user_id, created_at DESC);
CREATE INDEX idx_backtests_strategy ON backtests(strategy_id) WHERE strategy_id IS NOT NULL;

-- ─── Backtest Results (summary) ───────────────────────────────
CREATE TABLE backtest_results (
    backtest_id             UUID PRIMARY KEY REFERENCES backtests(id) ON DELETE CASCADE,
    final_capital           NUMERIC(16,4),
    total_return_pct        NUMERIC(10,4),
    annualised_return_pct   NUMERIC(10,4),
    max_drawdown_pct        NUMERIC(10,4),
    sharpe_ratio            NUMERIC(8,4),
    sortino_ratio           NUMERIC(8,4),
    calmar_ratio            NUMERIC(8,4),
    profit_factor           NUMERIC(8,4),
    win_rate_pct            NUMERIC(8,4),
    total_trades            INT,
    winning_trades          INT,
    losing_trades           INT,
    avg_win                 NUMERIC(16,4),
    avg_loss                NUMERIC(16,4),
    avg_hold_bars           NUMERIC(10,4),
    max_consecutive_wins    INT,
    max_consecutive_losses  INT,
    expectancy              NUMERIC(16,4),
    monthly_pnl             JSONB,          -- { "2025-01": 12345.0, ... }
    equity_curve            JSONB,          -- compressed timeseries
    computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Backtest Trades ───────────────────────────────────────────
CREATE TABLE backtest_trades (
    id              BIGSERIAL PRIMARY KEY,
    backtest_id     UUID NOT NULL REFERENCES backtests(id) ON DELETE CASCADE,
    tradingsymbol   TEXT NOT NULL,
    direction       TEXT NOT NULL CHECK (direction IN ('LONG','SHORT')),
    entry_time      TIMESTAMPTZ NOT NULL,
    exit_time       TIMESTAMPTZ,
    entry_price     NUMERIC(16,4) NOT NULL,
    exit_price      NUMERIC(16,4),
    quantity        INT NOT NULL,
    pnl             NUMERIC(16,4),
    pnl_pct         NUMERIC(10,4),
    mae             NUMERIC(16,4),   -- Maximum Adverse Excursion
    mfe             NUMERIC(16,4),   -- Maximum Favourable Excursion
    entry_signal    JSONB,
    exit_reason     TEXT            -- STOP_LOSS | TARGET | SIGNAL | EOD
);

CREATE INDEX idx_bt_trades_backtest ON backtest_trades(backtest_id);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 11 — OPTIONS ANALYTICS                             ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE options_analytics_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    underlying      TEXT NOT NULL,
    expiry          DATE NOT NULL,
    spot_price      NUMERIC(16,4) NOT NULL,
    future_price    NUMERIC(16,4),
    pcr             NUMERIC(8,4),   -- Put-Call Ratio (OI based)
    pcr_volume      NUMERIC(8,4),   -- PCR by volume
    max_pain        NUMERIC(16,4),  -- Max Pain strike
    atm_iv          NUMERIC(8,4),   -- ATM IV (annualised)
    iv_rank         NUMERIC(8,4),   -- IV Rank 0-100
    iv_percentile   NUMERIC(8,4),
    vix             NUMERIC(8,4),
    total_call_oi   BIGINT,
    total_put_oi    BIGINT,
    total_call_vol  BIGINT,
    total_put_vol   BIGINT,
    snapshotted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (snapshotted_at);

CREATE TABLE oa_snapshots_2025_q1 PARTITION OF options_analytics_snapshots FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE oa_snapshots_2025_q2 PARTITION OF options_analytics_snapshots FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE oa_snapshots_2025_q3 PARTITION OF options_analytics_snapshots FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE oa_snapshots_2025_q4 PARTITION OF options_analytics_snapshots FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE oa_snapshots_2026_q1 PARTITION OF options_analytics_snapshots FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE oa_snapshots_default  PARTITION OF options_analytics_snapshots DEFAULT;

CREATE INDEX idx_oa_snaps_underlying ON options_analytics_snapshots(underlying, snapshotted_at DESC);

-- ─── Per-Strike Option Greeks & OI ────────────────────────────
CREATE TABLE option_strike_data (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_time   TIMESTAMPTZ NOT NULL,
    underlying      TEXT NOT NULL,
    expiry          DATE NOT NULL,
    strike          NUMERIC(10,2) NOT NULL,
    option_type     TEXT NOT NULL CHECK (option_type IN ('CE','PE')),
    last_price      NUMERIC(16,4),
    bid             NUMERIC(16,4),
    ask             NUMERIC(16,4),
    iv              NUMERIC(8,4),
    delta           NUMERIC(8,6),
    gamma           NUMERIC(10,8),
    theta           NUMERIC(8,4),
    vega            NUMERIC(8,4),
    rho             NUMERIC(8,4),
    open_interest   BIGINT,
    oi_change       BIGINT,
    volume          BIGINT,
    instrument_token BIGINT
) PARTITION BY RANGE (snapshot_time);

CREATE TABLE osd_2025_q1 PARTITION OF option_strike_data FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE osd_2025_q2 PARTITION OF option_strike_data FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE osd_2025_q3 PARTITION OF option_strike_data FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE osd_2025_q4 PARTITION OF option_strike_data FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE osd_2026_q1 PARTITION OF option_strike_data FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE osd_default   PARTITION OF option_strike_data DEFAULT;

CREATE INDEX idx_osd_underlying ON option_strike_data(underlying, expiry, snapshot_time DESC);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 12 — RISK MANAGEMENT                               ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE risk_profiles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_capital_at_risk_pct NUMERIC(5,2) NOT NULL DEFAULT 2.00,   -- per trade
    max_daily_loss_pct      NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    max_weekly_loss_pct     NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    max_positions           INT NOT NULL DEFAULT 5,
    max_position_size_pct   NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    auto_square_off_pct     NUMERIC(5,2) NOT NULL DEFAULT 80.00,   -- % of daily loss limit
    auto_square_off_time    TIME,                                   -- e.g. 15:15
    circuit_breaker_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    circuit_breaker_loss    NUMERIC(16,4),                         -- abs INR loss trigger
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Risk Rule Violations Log ──────────────────────────────────
CREATE TABLE risk_violations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    rule_type       TEXT NOT NULL,      -- MAX_DAILY_LOSS | MAX_POSITION | CIRCUIT_BREAKER
    description     TEXT NOT NULL,
    severity        TEXT NOT NULL CHECK (severity IN ('INFO','WARNING','BLOCK','CIRCUIT_BREAK')),
    order_id        UUID REFERENCES orders(id),
    value           NUMERIC(16,4),      -- the violating value
    threshold       NUMERIC(16,4),      -- the limit that was breached
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_violations_user ON risk_violations(user_id, created_at DESC);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 13 — WORKSPACE LAYOUTS                             ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE workspaces (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    icon        TEXT,
    color       TEXT,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspaces_user ON workspaces(user_id);

CREATE TABLE workspace_layouts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT 'Default',
    layout_json     JSONB NOT NULL DEFAULT '[]',   -- react-grid-layout config
    widget_configs  JSONB NOT NULL DEFAULT '{}',   -- per-widget settings keyed by widgetId
    breakpoint      TEXT NOT NULL DEFAULT 'lg'
                    CHECK (breakpoint IN ('xs','sm','md','lg','xl')),
    version         INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_layouts_workspace ON workspace_layouts(workspace_id);

-- ─── Chart Drawings (persisted) ───────────────────────────────
CREATE TABLE chart_drawings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tradingsymbol   TEXT NOT NULL,
    exchange        TEXT NOT NULL,
    timeframe       TEXT NOT NULL,
    drawing_type    TEXT NOT NULL,      -- trendline | hline | rect | fib | text | circle
    label           TEXT,
    color           TEXT NOT NULL DEFAULT '#3b82f6',
    line_width      INT NOT NULL DEFAULT 1,
    is_hidden       BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked       BOOLEAN NOT NULL DEFAULT FALSE,
    points          JSONB NOT NULL,     -- [{time, price}, {time, price}]
    properties      JSONB NOT NULL DEFAULT '{}',   -- style, fill, opacity
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drawings_user_symbol ON chart_drawings(user_id, tradingsymbol, exchange, timeframe);

-- ─── Saved Chart Templates ─────────────────────────────────────
CREATE TABLE chart_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    indicators      JSONB NOT NULL DEFAULT '[]',   -- [{type, params, color, visible}]
    chart_type      TEXT NOT NULL DEFAULT 'candlestick',
    style           JSONB NOT NULL DEFAULT '{}',
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chart_templates_user ON chart_templates(user_id);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 14 — NOTIFICATIONS                                  ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category    TEXT NOT NULL
                CHECK (category IN ('order','alert','strategy','system','risk','news')),
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    metadata    JSONB NOT NULL DEFAULT '{}',
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    read_at     TIMESTAMPTZ,
    action_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE notifications_2025_q3 PARTITION OF notifications FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE notifications_2025_q4 PARTITION OF notifications FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE notifications_2026_q1 PARTITION OF notifications FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE notifications_2026_q2 PARTITION OF notifications FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE notifications_default  PARTITION OF notifications DEFAULT;

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ─── Push Notification Subscriptions ──────────────────────────
CREATE TABLE push_subscriptions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    device_name TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, endpoint)
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 15 — SCANNER / SCREENER                            ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE scanners (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    universe    TEXT[] NOT NULL DEFAULT ARRAY['NSE_EQ'],
    conditions  JSONB NOT NULL DEFAULT '[]',   -- [{field, op, value}] condition tree
    timeframe   TEXT NOT NULL DEFAULT '5m',
    max_results INT NOT NULL DEFAULT 20,
    sort_by     TEXT,
    sort_dir    TEXT NOT NULL DEFAULT 'desc',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    run_every   INT NOT NULL DEFAULT 60,       -- seconds
    last_run    TIMESTAMPTZ,
    result_count INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scanners_user ON scanners(user_id);

CREATE TABLE scanner_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scanner_id      UUID NOT NULL REFERENCES scanners(id) ON DELETE CASCADE,
    tradingsymbol   TEXT NOT NULL,
    exchange        TEXT NOT NULL,
    matched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    snapshot        JSONB NOT NULL DEFAULT '{}'    -- price, volume, indicators at match
);

CREATE INDEX idx_scanner_results_scanner ON scanner_results(scanner_id, matched_at DESC);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 16 — PAPER TRADING                                 ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE paper_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT 'Paper Account',
    initial_capital NUMERIC(16,4) NOT NULL DEFAULT 1000000,
    current_capital NUMERIC(16,4) NOT NULL DEFAULT 1000000,
    realised_pnl    NUMERIC(16,4) NOT NULL DEFAULT 0,
    unrealised_pnl  NUMERIC(16,4) NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paper_accounts_user ON paper_accounts(user_id);

CREATE TABLE paper_orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_account_id    UUID NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
    tradingsymbol       TEXT NOT NULL,
    exchange            TEXT NOT NULL,
    transaction_type    TEXT NOT NULL CHECK (transaction_type IN ('BUY','SELL')),
    order_type          TEXT NOT NULL,
    quantity            INT NOT NULL,
    price               NUMERIC(16,4),
    trigger_price       NUMERIC(16,4),
    average_price       NUMERIC(16,4),
    status              TEXT NOT NULL DEFAULT 'OPEN',
    strategy_id         UUID REFERENCES strategies(id),
    placed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    filled_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 17 — BASKET ORDERS                                 ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE baskets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    is_executed     BOOLEAN NOT NULL DEFAULT FALSE,
    executed_at     TIMESTAMPTZ,
    net_value       NUMERIC(16,4),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE basket_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    basket_id       UUID NOT NULL REFERENCES baskets(id) ON DELETE CASCADE,
    tradingsymbol   TEXT NOT NULL,
    exchange        TEXT NOT NULL DEFAULT 'NSE',
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY','SELL')),
    order_type      TEXT NOT NULL DEFAULT 'MARKET',
    product         TEXT NOT NULL DEFAULT 'MIS',
    quantity        INT NOT NULL,
    price           NUMERIC(16,4),
    sort_order      INT NOT NULL DEFAULT 0,
    order_id        UUID REFERENCES orders(id)   -- set after execution
);

CREATE INDEX idx_basket_items_basket ON basket_items(basket_id);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 18 — STRATEGY MARKETPLACE                          ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE marketplace_listings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id         UUID NOT NULL REFERENCES strategies(id),
    author_id           UUID NOT NULL REFERENCES users(id),
    title               TEXT NOT NULL,
    description         TEXT NOT NULL,
    long_description    TEXT,
    category            TEXT,
    tags                TEXT[],
    price_inr           NUMERIC(10,2) NOT NULL DEFAULT 0,  -- 0 = free
    is_subscription     BOOLEAN NOT NULL DEFAULT FALSE,
    subscription_period TEXT,   -- monthly | quarterly | yearly
    backtest_summary    JSONB,
    is_approved         BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
    download_count      INT NOT NULL DEFAULT 0,
    avg_rating          NUMERIC(3,2),
    review_count        INT NOT NULL DEFAULT 0,
    preview_chart       TEXT,   -- URL to preview image
    listed_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marketplace_approved ON marketplace_listings(is_approved, listed_at DESC);

CREATE TABLE marketplace_purchases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id      UUID NOT NULL REFERENCES marketplace_listings(id),
    buyer_id        UUID NOT NULL REFERENCES users(id),
    payment_id      TEXT,
    amount_paid     NUMERIC(10,2) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (listing_id, buyer_id)
);

CREATE TABLE marketplace_reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id  UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title       TEXT,
    body        TEXT,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (listing_id, reviewer_id)
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 19 — AI / COPILOT                                  ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE ai_conversations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT,
    model       TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    context     JSONB NOT NULL DEFAULT '{}',  -- portfolio snapshot, active symbols
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    content         TEXT NOT NULL,
    tokens_used     INT,
    tool_calls      JSONB,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conv ON ai_messages(conversation_id, created_at);

CREATE TABLE ai_trade_suggestions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    conversation_id UUID REFERENCES ai_conversations(id),
    tradingsymbol   TEXT NOT NULL,
    direction       TEXT CHECK (direction IN ('BUY','SELL')),
    confidence      NUMERIC(5,4),
    reasoning       TEXT NOT NULL,
    entry_price     NUMERIC(16,4),
    stop_loss       NUMERIC(16,4),
    target_price    NUMERIC(16,4),
    timeframe       TEXT,
    accepted        BOOLEAN,
    order_id        UUID REFERENCES orders(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 20 — AUDIT & COMPLIANCE                            ║
-- ╚══════════════════════════════════════════════════════════════╝

SET search_path = audit, public;

CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID,
    action      TEXT NOT NULL,          -- USER_LOGIN | ORDER_PLACED | STRATEGY_TOGGLED | ...
    resource    TEXT,                   -- orders | strategies | alerts
    resource_id TEXT,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_log_2025_q3 PARTITION OF audit_log FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE audit_log_2025_q4 PARTITION OF audit_log FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE audit_log_2026_q1 PARTITION OF audit_log FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE audit_log_2026_q2 PARTITION OF audit_log FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE audit_log_default  PARTITION OF audit_log DEFAULT;

CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action, created_at DESC);

-- ─── API Usage Tracking (rate limiting / billing) ─────────────
SET search_path = trading, public;

CREATE TABLE api_usage (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id),
    endpoint        TEXT NOT NULL,
    method          TEXT NOT NULL,
    status_code     INT,
    latency_ms      INT,
    broker          TEXT,
    called_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (called_at);

CREATE TABLE api_usage_2026_q1 PARTITION OF api_usage FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE api_usage_2026_q2 PARTITION OF api_usage FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE api_usage_default  PARTITION OF api_usage DEFAULT;

CREATE INDEX idx_api_usage_user ON api_usage(user_id, called_at DESC);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 21 — HELPER FUNCTIONS & TRIGGERS                   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema IN ('trading','strategy','risk')
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_set_updated_at
             BEFORE UPDATE ON trading.%I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            t
        );
    END LOOP;
END;
$$;

-- ─── View: Active open positions with live PnL estimate ────────
CREATE VIEW trading.v_open_positions AS
SELECT
    p.id,
    p.user_id,
    p.tradingsymbol,
    p.exchange,
    p.product,
    p.quantity,
    p.average_price,
    p.last_price,
    p.unrealised_pnl,
    p.realised_pnl,
    (p.quantity * p.last_price) AS market_value,
    ba.broker,
    ba.client_id
FROM trading.positions p
JOIN trading.broker_accounts ba ON ba.id = p.broker_account_id
WHERE p.quantity != 0;

-- ─── View: Today's order summary per user ─────────────────────
CREATE VIEW trading.v_todays_orders AS
SELECT
    o.user_id,
    COUNT(*)                                        AS total_orders,
    COUNT(*) FILTER (WHERE o.status = 'COMPLETE')  AS filled,
    COUNT(*) FILTER (WHERE o.status = 'OPEN')      AS open,
    COUNT(*) FILTER (WHERE o.status = 'CANCELLED') AS cancelled,
    COUNT(*) FILTER (WHERE o.status = 'REJECTED')  AS rejected,
    SUM(o.quantity * o.average_price)
        FILTER (WHERE o.status = 'COMPLETE')        AS gross_turnover
FROM trading.orders o
WHERE o.created_at >= CURRENT_DATE
GROUP BY o.user_id;
