-- Database: options_data
CREATE DATABASE IF NOT EXISTS options_data;

-- 1. Option Chain Snapshot Table
-- Powers the options dashboard with historical snapshot lookup
CREATE TABLE IF NOT EXISTS options_data.option_chain (
    timestamp DateTime64(3),
    underlying LowCardinality(String),
    strike Float64,
    expiry Date,
    call_ltp Float64,
    put_ltp Float64,
    call_oi UInt64,
    put_oi UInt64,
    call_iv Float64,
    put_iv Float64,
    call_change_oi Int64,
    put_change_oi Int64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (underlying, expiry, strike, timestamp)
TTL timestamp + INTERVAL 6 MONTH; -- 180-day retention for options snapshots

-- 2. Greeks Snapshot Table
-- For historical implied volatility and sensitivity analysis
CREATE TABLE IF NOT EXISTS options_data.greeks (
    timestamp DateTime64(3),
    instrument_token UInt32,
    underlying LowCardinality(String),
    delta Float64,
    gamma Float64,
    theta Float64,
    vega Float64,
    rho Float64,
    iv Float64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (instrument_token, timestamp);
