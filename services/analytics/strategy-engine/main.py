from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import pandas as pd
import numpy as np
import requests
import os
import logging

app = FastAPI(title="ZengTrade Strategy Engine")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ORDER_SERVICE_URL = os.getenv("ORDER_SERVICE_URL", "http://localhost:8080/orders")

class StrategyConfig(BaseModel):
    strategy_id: str
    symbol: str
    parameters: dict

class TickData(BaseModel):
    symbol: str
    price: float
    timestamp: float

# In-memory storage for current state (simplified)
active_strategies = {}
market_data_history = {}

@app.post("/strategies/start")
async def start_strategy(config: StrategyConfig):
    active_strategies[config.strategy_id] = config.dict()
    market_data_history[config.symbol] = []
    logger.info(f"Started strategy {config.strategy_id} for {config.symbol}")
    return {"status": "started", "strategy_id": config.strategy_id}

@app.post("/ticks")
async def process_tick(tick: TickData, background_tasks: BackgroundTasks):
    if tick.symbol not in market_data_history:
        return {"status": "ignored", "reason": "no active strategy for symbol"}
    
    # Append tick to history
    market_data_history[tick.symbol].append({"price": tick.price, "time": tick.timestamp})
    
    # Trigger strategy evaluation in background
    background_tasks.add_task(evaluate_strategies, tick.symbol)
    
    return {"status": "processing"}

def evaluate_strategies(symbol):
    history = market_data_history.get(symbol, [])
    if len(history) < 20:  # Need enough data
        return
    
    df = pd.DataFrame(history)
    df['sma20'] = df['price'].rolling(window=20).mean()
    df['sma5'] = df['price'].rolling(window=5).mean()
    
    last_row = df.iloc[-1]
    prev_row = df.iloc[-2]
    
    # Simple SMA Crossover Check
    if prev_row['sma5'] <= prev_row['sma20'] and last_row['sma5'] > last_row['sma20']:
        logger.info(f"BUY SIGNAL for {symbol} at {last_row['price']}")
        trigger_order(symbol, "BUY", last_row['price'])
    elif prev_row['sma5'] >= prev_row['sma20'] and last_row['sma5'] < last_row['sma20']:
        logger.info(f"SELL SIGNAL for {symbol} at {last_row['price']}")
        trigger_order(symbol, "SELL", last_row['price'])

def trigger_order(symbol, side, price):
    try:
        # Construct order payload (Variety + Params)
        payload = {
            "variety": "regular",
            "params": {
                "exchange": "NSE",
                "tradingsymbol": symbol,
                "transaction_type": side,
                "order_type": "MARKET",
                "quantity": 1,
                "product": "MIS"
            }
        }
        response = requests.post(ORDER_SERVICE_URL, json=payload)
        response.raise_for_status()
        logger.info(f"Order triggered successfully: {response.json()}")
    except Exception as e:
        logger.error(f"Failed to trigger order: {e}")

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
