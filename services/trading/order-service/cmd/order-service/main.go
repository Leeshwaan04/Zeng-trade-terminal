package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"zengtrade/broker-gateway/pkg/adapters"
	"zengtrade/broker-gateway/pkg/broker"

	"github.com/segmentio/kafka-go"
)

var (
	kiteApiKey      = os.Getenv("KITE_API_KEY")
	kiteAccessToken = os.Getenv("KITE_ACCESS_TOKEN")
)

func main() {
	// Initialize Router
	router := broker.NewRouter()

	// Register Kite Adapter
	if kiteApiKey != "" && kiteAccessToken != "" {
		kiteAdapter := adapters.NewKiteAdapter(kiteApiKey, kiteAccessToken)
		router.Register("kite", kiteAdapter)
		fmt.Println("Registered Zerodha Kite adapter")
	}

	// Register Placeholders
	router.Register("fyers", adapters.NewFyersAdapter())
	router.Register("dhan", adapters.NewDhanAdapter())

	kafkaWriter := &kafka.Writer{
		Addr:     kafka.TCP(os.Getenv("KAFKA_BROKERS")),
		Topic:    "broker.orders.updates",
		Balancer: &kafka.LeastBytes{},
		Async:    true,
	}
	defer kafkaWriter.Close()

	http.HandleFunc("/orders", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			var req struct {
				Broker  string               `json:"broker"` // "kite", "fyers", "dhan"
				Variety string               `json:"variety"`
				Params  broker.OrderRequest `json:"params"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			if req.Broker == "" {
				req.Broker = "kite" // Default
			}

			b, err := router.GetBroker(req.Broker)
			if err != nil {
				http.Error(w, err.Error(), http.StatusNotFound)
				return
			}

			// Place order via abstracted broker
			res, err := b.PlaceOrder(req.Params)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			// Emit initial event to Kafka
			event := map[string]interface{}{
				"order_id":   res.OrderID,
				"instrument": req.Params.Tradingsymbol,
				"status":     "SENT_TO_BROKER",
				"side":       req.Params.TransactionType,
				"quantity":   req.Params.Quantity,
				"broker":     req.Broker,
			}
			payload, _ := json.Marshal(event)
			kafkaWriter.WriteMessages(r.Context(), kafka.Message{
				Key:   []byte(res.OrderID),
				Value: payload,
			})

			json.NewEncoder(w).Encode(map[string]string{"order_id": res.OrderID})

		case http.MethodGet:
			// In a real app, we'd fetch from a unified DB or aggregate from brokers
			http.Error(w, "Use GET /portfolio to see positions across brokers", http.StatusNotImplemented)

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Order Service (MBAL Enabled) starting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
