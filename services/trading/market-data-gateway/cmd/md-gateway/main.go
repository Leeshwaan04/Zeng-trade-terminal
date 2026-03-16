package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"time"

	"github.com/segmentio/kafka-go"
	kiteticker "github.com/zerodha/gokiteconnect/v4/ticker"
)

var (
	apiKey       = os.Getenv("KITE_API_KEY")
	accessToken  = os.Getenv("KITE_ACCESS_TOKEN")
	kafkaBrokers = os.Getenv("KAFKA_BROKERS")
)

func main() {
	if apiKey == "" || accessToken == "" {
		log.Fatal("KITE_API_KEY and KITE_ACCESS_TOKEN environment variables must be set")
	}
	if kafkaBrokers == "" {
		kafkaBrokers = "localhost:9092"
	}

	// Kafka Writer Configuration
	writer := &kafka.Writer{
		Addr:     kafka.TCP(kafkaBrokers),
		Topic:    "market.ticks.raw",
		Balancer: &kafka.LeastBytes{},
		Async:    true, // High performance async writes
	}
	defer writer.Close()

	// Create new Kite Ticker instance
	ticker := kiteticker.New(apiKey, accessToken)

	// Callback for connection
	ticker.OnConnect(func() {
		fmt.Println("Connected to Kite Ticker")
		err := ticker.Subscribe([]uint32{256265}) // NIFTY 50 example
		if err != nil {
			log.Printf("Error subscribing: %v", err)
		}
		err = ticker.SetMode(kiteticker.ModeFull, []uint32{256265})
		if err != nil {
			log.Printf("Error setting mode: %v", err)
		}
	})

	// Callback for ticks - Produce to Kafka
	ticker.OnTick(func(tick kiteticker.Tick) {
		payload, err := json.Marshal(tick)
		if err != nil {
			log.Printf("Error marshaling tick: %v", err)
			return
		}

		err = writer.WriteMessages(context.Background(),
			kafka.Message{
				Key:   []byte(fmt.Sprintf("%d", tick.InstrumentToken)),
				Value: payload,
			},
		)
		if err != nil {
			log.Printf("Error writing to Kafka: %v", err)
		}
	})

	// Standard error/close callbacks...
	ticker.OnError(func(err error) { log.Printf("Ticker Error: %v", err) })
	ticker.OnClose(func(code int, reason string) { fmt.Printf("Closed: %d %s\n", code, reason) })

	go ticker.Serve()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c

	ticker.Stop()
	fmt.Println("Shutting down Market Data Gateway...")
}
