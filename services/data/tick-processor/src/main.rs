use serde::{Deserialize, Serialize};
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::message::Message;
use std::time::Duration;
use chrono::Utc;

#[derive(Debug, Deserialize)]
struct KiteTick {
    instrument_token: u32,
    last_price: f64,
    volume: u32,
    oi: u32,
    // Add other fields from Kite Ticker as needed
}

#[derive(Debug, Serialize)]
struct NormalizedTick {
    instrument_token: u32,
    timestamp: String,
    ltp: f64,
    volume: u32,
    oi: u32,
    vwap: f64,
    delta: f64,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("ZengTrade Tick Processor (Rust) - High Performance Streamer starting...");

    let brokers = std::env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".to_string());

    // Kafka Consumer: Raw Ticks
    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", "tick-processor-group")
        .set("bootstrap.servers", &brokers)
        .set("enable.partition.eof", "false")
        .set("session.timeout.ms", "6000")
        .set("enable.auto.commit", "true")
        .create()?;

    consumer.subscribe(&["market.ticks.raw"])?;

    // Kafka Producer: Normalized Ticks
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", &brokers)
        .set("message.timeout.ms", "5000")
        .create()?;

    println!("Listening for raw ticks on 'market.ticks.raw'...");

    loop {
        match consumer.recv().await {
            Err(e) => println!("Kafka error: {}", e),
            Ok(m) => {
                let payload = match m.payload_view::<str>() {
                    None => "",
                    Some(Ok(s)) => s,
                    Some(Err(e)) => {
                        println!("Error decoding message payload: {:?}", e);
                        ""
                    }
                };

                if let Ok(raw_tick) = serde_json::from_str::<KiteTick>(payload) {
                    // Normalization & Calculation Logic
                    let normalized = NormalizedTick {
                        instrument_token: raw_tick.instrument_token,
                        timestamp: Utc::now().to_rfc3339(),
                        ltp: raw_tick.last_price,
                        volume: raw_tick.volume,
                        oi: raw_tick.oi,
                        vwap: raw_tick.last_price, // Placeholder for actual VWAP logic
                        delta: 0.0,               // Placeholder for order flow delta
                    };

                    let normalized_payload = serde_json::to_string(&normalized)?;

                    // Produce to Normalized Topic
                    let key = raw_tick.instrument_token.to_string();
                    producer.send(
                        FutureRecord::to("market.ticks.normalized")
                            .payload(&normalized_payload)
                            .key(&key),
                        Duration::from_secs(0),
                    ).await.map_err(|(e, _)| e)?;
                }
            }
        };
    }
}
