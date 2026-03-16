package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"zengtrade/notification-service/pkg/notify"
)

func main() {
	dispatcher := notify.NewDispatcher()

	// Post a notification
	http.HandleFunc("/notify", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var n notify.Notification
		if err := json.NewDecoder(r.Body).Decode(&n); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if err := dispatcher.Notify(n); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]string{"status": "dispatched"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8086"
	}

	fmt.Printf("Notification Service starting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
