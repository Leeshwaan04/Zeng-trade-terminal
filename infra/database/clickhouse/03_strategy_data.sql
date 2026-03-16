-- Database: strategy_data
CREATE DATABASE IF NOT EXISTS strategy_data;

-- 1. Strategy Signals Table
-- Audit trail for all automated order triggers and exits
CREATE TABLE IF NOT EXISTS strategy_data.signals (
    strategy_id LowCardinality(String),
    instrument_token UInt32,
    timestamp DateTime64(3),
    signal_type Enum8('BUY' = 1, 'SELL' = 2, 'EXIT' = 3),
    price Float64,
    confidence Float64,
    metadata String -- JSON for signal-specific params (e.g., indicator values)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (strategy_id, instrument_token, timestamp);

-- 2. Backtest Results Table
-- Performance repository for simulated strategies
CREATE TABLE IF NOT EXISTS strategy_data.backtests (
    backtest_id UUID DEFAULT generateUUIDv4(), -- unique ID per backtest run
    strategy_id LowCardinality(String),
    start_date Date,
    end_date Date,
    total_return Float64,
    max_drawdown Float64,
    sharpe_ratio Float64,
    win_rate Float64,
    config String -- JSON of parameters used during the backtest
)
ENGINE = MergeTree()
ORDER BY (strategy_id, end_date);
