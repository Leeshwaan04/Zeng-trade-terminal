package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/segmentio/kafka-go"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Allow all for terminal
}

type Client struct {
	conn *websocket.Conn
	send chan []byte
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.Mutex
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{conn: conn, send: make(chan []byte, 256)}
	hub.register <- client

	go client.writePump()
}

func (c *Client) writePump() {
	defer func() {
		c.conn.Close()
	}()
	for message := range c.send {
		err := c.conn.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			break
		}
	}
}

func consumeKafka(ctx context.Context, hub *Hub, brokers []string, topic string, msgType string) {
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers: brokers,
		Topic:   topic,
		GroupID: "realtime-gateway-group",
	})
	defer r.Close()

	for {
		m, err := r.ReadMessage(ctx)
		if err != nil {
			log.Printf("error reading from %s: %v", topic, err)
			break
		}

		// Wrap the message with a type for the-frontend
		var data interface{}
		json.Unmarshal(m.Value, &data)
		
		wrapped := map[string]interface{}{
			"type": msgType,
			"data": data,
		}
		
		finalMsg, _ := json.Marshal(wrapped)
		hub.broadcast <- finalMsg
	}
}

func main() {
	brokers := os.Getenv("KAFKA_BROKERS")
	if brokers == "" {
		brokers = "localhost:9092"
	}
	brokerList := []string{brokers}

	hub := newHub()
	go hub.run()

	ctx := context.Background()

	// Consumer goroutines for different topics
	go consumeKafka(ctx, hub, brokerList, "market.ticks.normalized", "tick")
	go consumeKafka(ctx, hub, brokerList, "market.candles.1m", "candle")
	go consumeKafka(ctx, hub, brokerList, "strategy.signals", "signal")
	go consumeKafka(ctx, hub, brokerList, "portfolio.pnl", "pnl")
	go consumeKafka(ctx, hub, brokerList, "orders.events", "order")

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	fmt.Printf("Realtime Gateway starting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
