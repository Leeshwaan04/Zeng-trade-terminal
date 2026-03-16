package state

import (
	"time"
)

type OrderStatus string

const (
	StatusCreated        OrderStatus = "CREATED"
	StatusValidated      OrderStatus = "VALIDATED"
	StatusSentToBroker   OrderStatus = "SENT_TO_BROKER"
	StatusOpen           OrderStatus = "OPEN"
	StatusPartiallyFilled OrderStatus = "PARTIALLY_FILLED"
	StatusFilled         OrderStatus = "FILLED"
	StatusCancelled      OrderStatus = "CANCELLED"
	StatusRejected       OrderStatus = "REJECTED"
)

type OrderEvent struct {
	OrderID        string      `json:"order_id"`
	BrokerOrderID  string      `json:"broker_order_id,omitempty"`
	Instrument     string      `json:"instrument"`
	Side           string      `json:"side"` // BUY/SELL
	Quantity       int         `json:"quantity"`
	FilledQuantity int         `json:"filled_quantity"`
	Price          float64     `json:"price"`
	Status         OrderStatus `json:"status"`
	Timestamp      time.Time   `json:"timestamp"`
	Message        string      `json:"message,omitempty"`
}

type OrderLedger struct {
	OrderID        string
	UserID         string
	BrokerOrderID  string
	Instrument     string
	Side           string
	Quantity       int
	FilledQuantity int
	Price          float64
	Status         OrderStatus
	CreatedAt      time.Time
	UpdatedAt      time.Time
}
