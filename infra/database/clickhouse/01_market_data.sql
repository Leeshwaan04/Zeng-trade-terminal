-- Database: market_data
CREATE DATABASE IF NOT EXISTS market_data;

-- 1. Raw Ticks Table
-- Optimized for high-speed ingestion and time-range queries
CREATE TABLE IF NOT EXISTS market_data.ticks (
    instrument_token UInt32,
    timestamp DateTime64(3),
    ltp Float64,
    bid_price Float64,
    ask_price Float64,
    bid_qty UInt32,
    ask_qty UInt32,
    volume UInt64,
    oi UInt64,
    vwap Float64,
    exchange LowCardinality(String) DEFAULT 'NSE'
) 
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (instrument_token, timestamp)
TTL timestamp + INTERVAL 30 DAY; -- 30-day retention for raw ticks

-- 2. Candle Data Table (OHLCV)
-- Perma-storage for charting and historical analysis
CREATE TABLE IF NOT EXISTS market_data.candles (
    instrument_token UInt32,
    interval LowCardinality(String), -- '1m', '5m', '1h', '1d'
    timestamp DateTime,
    open Float64,
    high Float64,
    low Float64,
    close Float64,
    volume UInt64,
    oi UInt64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (instrument_token, interval, timestamp);

-- 3. Materialized View: 1-Minute Candle Generation
-- Automatically aggregates ticks into 1-minute candles on ingestion
CREATE MATERIALIZED VIEW IF NOT EXISTS market_data.mv_candles_1m
TO market_data.candles
AS SELECT
    instrument_token,
    '1m' AS interval,
    toStartOfMinute(timestamp) AS timestamp,
    argMin(ltp, timestamp) AS open,
    max(ltp) AS high,
    min(ltp) AS low,
    argMax(ltp, timestamp) AS close,
    max(volume) - min(volume) AS volume, -- incremental volume calculation
    last_value(oi) AS oi
FROM market_data.ticks
GROUP BY instrument_token, timestamp;
