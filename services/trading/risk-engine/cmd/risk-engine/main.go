package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"zengtrade/risk-engine/pkg/risk"

	kiteconnect "github.com/zerodha/gokiteconnect/v4"
)

var (
	apiKey      = os.Getenv("KITE_API_KEY")
	accessToken = os.Getenv("KITE_ACCESS_TOKEN")
)

func main() {
	if apiKey == "" || accessToken == "" {
		log.Fatal("KITE_API_KEY and KITE_ACCESS_TOKEN environment variables must be set")
	}

	// Load initial risk config (in production, this would be in a DB/Redis)
	config := risk.RiskConfig{
		MaxQuantity:      1000,
		MaxDailyLoss:     50000.0,
		MaxOpenPositions: 10,
	}

	riskEngine := risk.NewEngine(apiKey, accessToken, config)

	// Validate order before placement
	http.HandleFunc("/risk/validate", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var params kiteconnect.OrderParams
		if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if err := riskEngine.PreTradeCheck(params); err != nil {
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "rejected",
				"reason": err.Error(),
			})
			return
		}

		json.NewEncoder(w).Encode(map[string]string{"status": "approved"})
	})

	// Add more endpoints for updating risk config
	http.HandleFunc("/risk/config", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			// json.NewEncoder(w).Encode(riskEngine.GetConfig())
		} else if r.Method == http.MethodPost {
			// Update the config
		}
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}

	fmt.Printf("Risk Engine starting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
