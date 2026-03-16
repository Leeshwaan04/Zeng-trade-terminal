package broker

import (
)

// OrderRequest is a unified order request model
type OrderRequest struct {
	Variety        string
	Tradingsymbol  string
	Exchange       string
	TransactionType string
	OrderType      string
	Quantity       int
	Price          float64
	Product        string
	Validity       string
}

// OrderResponse is a unified order response model
type OrderResponse struct {
	OrderID string
}

// Position is a unified position model
type Position struct {
	Symbol        string
	Quantity      int
	AveragePrice  float64
	LastPrice     float64
	PnL           float64
	Exchange      string
}

// Broker defines the contract for all broker adapters
type Broker interface {
	GetID() string
	PlaceOrder(req OrderRequest) (OrderResponse, error)
	CancelOrder(orderID string, variety string) (string, error)
	GetPositions() ([]Position, error)
	// Add more methods as needed (GetOrders, StreamMarketData, etc.)
}
