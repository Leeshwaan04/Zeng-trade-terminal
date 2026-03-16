package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"zengtrade/portfolio-service/pkg/portfolio"
)

var (
	apiKey      = os.Getenv("KITE_API_KEY")
	accessToken = os.Getenv("KITE_ACCESS_TOKEN")
)

func main() {
	if apiKey == "" || accessToken == "" {
		log.Fatal("KITE_API_KEY and KITE_ACCESS_TOKEN environment variables must be set")
	}

	portfolioService := portfolio.NewService(apiKey, accessToken)

	http.HandleFunc("/positions", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		positions, err := portfolioService.GetPositions()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(positions)
	})

	http.HandleFunc("/holdings", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		holdings, err := portfolioService.GetHoldings()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(holdings)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	fmt.Printf("Portfolio Service starting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
