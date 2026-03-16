package portfolio

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

func (s *Service) GetPositions() (*kiteconnect.Positions, error) {
	positions, err := s.client.GetPositions()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch positions: %w", err)
	}
	return &positions, nil
}

func (s *Service) GetHoldings() (kiteconnect.Holdings, error) {
	holdings, err := s.client.GetHoldings()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch holdings: %w", err)
	}
	return holdings, nil
}
