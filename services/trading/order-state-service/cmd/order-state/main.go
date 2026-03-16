package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"zengtrade/order-state-service/pkg/state"

	"github.com/segmentio/kafka-go"
)

var (
	kafkaBrokers = os.Getenv("KAFKA_BROKERS")
)

func main() {
	if kafkaBrokers == "" {
		kafkaBrokers = "localhost:9092"
	}

	// Reader for broker updates
	brokerReader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: []string{kafkaBrokers},
		Topic:   "broker.orders.updates",
		GroupID: "order-state-service-group",
	})
	defer brokerReader.Close()

	// Writer for standardized system events
	orderWriter := &kafka.Writer{
		Addr:     kafka.TCP(kafkaBrokers),
		Topic:    "orders.events",
		Balancer: &kafka.LeastBytes{},
		Async:    true,
	}
	defer orderWriter.Close()

	fmt.Println("Order State Service (OSS) starting...")

	ctx := context.Background()
	var mu sync.Mutex
	// Local cache for idempotency/state (In production, use Redis/Postgres)
	orderStates := make(map[string]state.OrderStatus)

	for {
		m, err := brokerReader.ReadMessage(ctx)
		if err != nil {
			log.Printf("error reading from broker updates: %v", err)
			break
		}

		var brokerEvent state.OrderEvent
		if err := json.Unmarshal(m.Value, &brokerEvent); err != nil {
			log.Printf("error unmarshaling broker event: %v", err)
			continue
		}

		// Idempotency check
		mu.Lock()
		prevStatus, exists := orderStates[brokerEvent.OrderID]
		if exists && prevStatus == brokerEvent.Status {
			mu.Unlock()
			continue // Skip duplicate/redundant transition
		}
		orderStates[brokerEvent.OrderID] = brokerEvent.Status
		mu.Unlock()

		// Enrich event
		brokerEvent.Timestamp = time.Now()

		// Publish standardized event for Frontend & Analytics
		payload, _ := json.Marshal(brokerEvent)
		err = orderWriter.WriteMessages(ctx, kafka.Message{
			Key:   []byte(brokerEvent.OrderID),
			Value: payload,
		})

		if err != nil {
			log.Printf("failed to publish order event: %v", err)
		} else {
			log.Printf("[OSS] Order %s transition: %s", brokerEvent.OrderID, brokerEvent.Status)
		}
	}
}
