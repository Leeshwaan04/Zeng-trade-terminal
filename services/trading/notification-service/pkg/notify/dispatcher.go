package notify

import (
	"log"
)

type Notification struct {
	Level    string `json:"level"`      // INFO, WARN, ERROR, CRITICAL
	Message  string `json:"message"`
	Source   string `json:"source"`
	Category string `json:"category"`   // TRADE, SYSTEM, MARGIN
}

type Dispatcher struct {
	// Channels for various providers
}

func NewDispatcher() *Dispatcher {
	return &Dispatcher{}
}

func (d *Dispatcher) Notify(n Notification) error {
	// 1. Dispatch to Logs
	log.Printf("[%s][%s] %s: %s", n.Level, n.Category, n.Source, n.Message)

	// 2. Mock Telegram / Push
	// if n.Level == "CRITICAL" { ... call Telegram ... }

	return nil
}
