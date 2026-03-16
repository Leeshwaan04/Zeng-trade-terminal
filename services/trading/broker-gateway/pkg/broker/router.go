package broker

import (
	"fmt"
	"sync"
)

type Router struct {
	adapters map[string]Broker
	mu       sync.RWMutex
}

func NewRouter() *Router {
	return &Router{
		adapters: make(map[string]Broker),
	}
}

func (r *Router) Register(name string, adapter Broker) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.adapters[name] = adapter
}

func (r *Router) GetBroker(name string) (Broker, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	adapter, ok := r.adapters[name]
	if !ok {
		return nil, fmt.Errorf("broker adapter '%s' not found", name)
	}
	return adapter, nil
}

// ListBrokers returns the list of registered broker names
func (r *Router) ListBrokers() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []string
	for name := range r.adapters {
		list = append(list, name)
	}
	return list
}
