package adapters

import (
	"zengtrade/broker-gateway/pkg/broker"

	kiteconnect "github.com/zerodha/gokiteconnect/v4"
)

type KiteAdapter struct {
	client *kiteconnect.Client
}

func NewKiteAdapter(apiKey, accessToken string) *KiteAdapter {
	client := kiteconnect.New(apiKey)
	client.SetAccessToken(accessToken)
	return &KiteAdapter{client: client}
}

func (a *KiteAdapter) GetID() string {
	return "kite"
}

func (a *KiteAdapter) PlaceOrder(req broker.OrderRequest) (broker.OrderResponse, error) {
	params := kiteconnect.OrderParams{
		Exchange:        req.Exchange,
		Tradingsymbol:   req.Tradingsymbol,
		TransactionType: req.TransactionType,
		Quantity:        req.Quantity,
		OrderType:       req.OrderType,
		Product:         req.Product,
		Price:           req.Price,
		Validity:        req.Validity,
	}

	order, err := a.client.PlaceOrder(req.Variety, params)
	if err != nil {
		return broker.OrderResponse{}, err
	}

	return broker.OrderResponse{OrderID: order.OrderID}, nil
}

func (a *KiteAdapter) CancelOrder(orderID string, variety string) (string, error) {
	order, err := a.client.CancelOrder(variety, orderID, nil)
	if err != nil {
		return "", err
	}
	return order.OrderID, nil
}

func (a *KiteAdapter) GetPositions() ([]broker.Position, error) {
	positions, err := a.client.GetPositions()
	if err != nil {
		return nil, err
	}

	var unifiedPositions []broker.Position
	// Combine day and net positions as kite does
	for _, p := range positions.Net {
		unifiedPositions = append(unifiedPositions, broker.Position{
			Symbol:       p.Tradingsymbol,
			Quantity:     int(p.Quantity),
			AveragePrice: p.AveragePrice,
			LastPrice:    p.LastPrice,
			PnL:          p.PnL,
			Exchange:     p.Exchange,
		})
	}

	return unifiedPositions, nil
}
