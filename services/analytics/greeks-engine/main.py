from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
from scipy.stats import norm
import math

app = FastAPI(title="ZengTrade Greeks Engine")

class OptionData(BaseModel):
    S: float  # Underlying price
    K: float  # Strike price
    T: float  # Time to expiration (years)
    r: float  # Risk-free rate
    sigma: float  # Volatility
    option_type: str  # 'call' or 'put'

def calculate_greeks(S, K, T, r, sigma, option_type='call'):
    if T <= 0:
        T = 1e-6  # Prevent division by zero
    
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    
    if option_type == 'call':
        price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        delta = norm.cdf(d1)
        theta = (- (S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) 
                 - r * K * np.exp(-r * T) * norm.cdf(d2))
    else:
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        delta = norm.cdf(d1) - 1
        theta = (- (S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) 
                 + r * K * np.exp(-r * T) * norm.cdf(-d2))
    
    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    vega = S * norm.pdf(d1) * np.sqrt(T) / 100  # Divide by 100 to get per 1% change
    
    return {
        "price": float(price),
        "delta": float(delta),
        "gamma": float(gamma),
        "theta": float(theta / 365),  # Per day
        "vega": float(vega)
    }

@app.post("/calculate")
async def calculate(data: OptionData):
    if data.option_type.lower() not in ['call', 'put']:
        raise HTTPException(status_code=400, detail="option_type must be 'call' or 'put'")
    
    try:
        results = calculate_greeks(data.S, data.K, data.T, data.r, data.sigma, data.option_type.lower())
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
