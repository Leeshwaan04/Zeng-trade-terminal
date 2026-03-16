-- Kafka Engine for Normalized Ticks
-- This table acts as a consumer for the 'market.ticks.normalized' topic
CREATE TABLE IF NOT EXISTS market_data.kafka_ticks_normalized (
    instrument_token UInt32,
    timestamp DateTime64(3),
    ltp Float64,
    volume UInt64,
    oi UInt64,
    vwap Float64,
    delta Float64
) 
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka.zengtrade-infra.svc.cluster.local:9092',
    kafka_topic_list = 'market.ticks.normalized',
    kafka_group_name = 'clickhouse-consumer-group',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 3;

-- Materialized View to pipe data from Kafka to the final 'ticks' table
CREATE MATERIALIZED VIEW IF NOT EXISTS market_data.mv_kafka_to_ticks
TO market_data.ticks
AS SELECT * FROM market_data.kafka_ticks_normalized;

-- Kafka Engine for Strategy Signals
CREATE TABLE IF NOT EXISTS strategy_data.kafka_signals (
    strategy_id String,
    instrument_token UInt32,
    timestamp DateTime64(3),
    signal_type String,
    price Float64,
    confidence Float64,
    metadata String
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka.zengtrade-infra.svc.cluster.local:9092',
    kafka_topic_list = 'strategy.signals',
    kafka_group_name = 'clickhouse-strategy-consumer',
    kafka_format = 'JSONEachRow';

-- Materialized View for Signals
CREATE MATERIALIZED VIEW IF NOT EXISTS strategy_data.mv_kafka_to_signals
TO strategy_data.signals
AS SELECT 
    strategy_id,
    instrument_token,
    timestamp,
    CAST(signal_type, 'Enum8(\'BUY\' = 1, \'SELL\' = 2, \'EXIT\' = 3)') as signal_type,
    price,
    confidence,
    metadata
FROM strategy_data.kafka_signals;
