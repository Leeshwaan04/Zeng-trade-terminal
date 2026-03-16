use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Position {
    instrument_token: u32,
    qty: i32,
    avg_price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct PnLUpdate {
    instrument_token: u32,
    unrealized_pnl: f64,
    exposure: f64,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("ZengTrade PnL Engine (Rust) starting...");

    // Local position state
    let position = Position {
        instrument_token: 256265,
        qty: 100,
        avg_price: 24300.0,
    };

    // Current Market Price simulation
    let current_price = 24350.5;

    // Calculation: (Current - Avg) * Qty
    let unrealized_pnl = (current_price - position.avg_price) * position.qty as f64;
    let exposure = current_price * position.qty as f64;

    let update = PnLUpdate {
        instrument_token: position.instrument_token,
        unrealized_pnl,
        exposure,
    };

    println!("Real-time PnL Calculation Result: {:?}", update);

    // Placeholder loop to simulate continuous calculation
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(60)).await;
    }
}
