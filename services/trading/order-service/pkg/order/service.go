package order

import (
	"fmt"

	kiteconnect "github.com/zerodha/gokiteconnect/v4"
)

type Service struct {
	client *kiteconnect.Client
}

func NewService(apiKey, accessToken string) *Service {
	client := kiteconnect.New(apiKey)
	client.SetAccessToken(accessToken)
	return &Service{client: client}
}

func (s *Service) PlaceOrder(variety string, params kiteconnect.OrderParams) (string, error) {
	orderResponse, err := s.client.PlaceOrder(variety, params)
	if err != nil {
		return "", fmt.Errorf("failed to place order: %w", err)
	}
	return orderResponse.OrderID, nil
}

func (s *Service) CancelOrder(variety, orderID string) (string, error) {
	orderResponse, err := s.client.CancelOrder(variety, orderID, nil)
	if err != nil {
		return "", fmt.Errorf("failed to cancel order: %w", err)
	}
	return orderResponse.OrderID, nil
}

func (s *Service) ModifyOrder(variety, orderID string, params kiteconnect.OrderParams) (string, error) {
	orderResponse, err := s.client.ModifyOrder(variety, orderID, params)
	if err != nil {
		return "", fmt.Errorf("failed to modify order: %w", err)
	}
	return orderResponse.OrderID, nil
}

func (s *Service) GetOrders() (kiteconnect.Orders, error) {
	orders, err := s.client.GetOrders()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch orders: %w", err)
	}
	return orders, nil
}
