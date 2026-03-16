package risk

import (
	"errors"
	"fmt"

	kiteconnect "github.com/zerodha/gokiteconnect/v4"
)

var (
	ErrMaxPositionSizeExceeded = errors.New("maximum position size exceeded")
	ErrDailyLossLimitExceeded  = errors.New("daily loss limit exceeded")
	ErrInsufficientMargin      = errors.New("insufficient margin")
)

type RiskConfig struct {
	MaxQuantity      int     `json:"max_quantity"`      // Per order
	MaxDailyLoss     float64 `json:"max_daily_loss"`    // Unrealized + Realized
	MaxOpenPositions int     `json:"max_open_positions"`
}

type Engine struct {
	client *kiteconnect.Client
	config RiskConfig
}

func NewEngine(apiKey, accessToken string, config RiskConfig) *Engine {
	client := kiteconnect.New(apiKey)
	client.SetAccessToken(accessToken)
	return &Engine{
		client: client,
		config: config,
	}
}

// PreTradeCheck validates if an order is safe to place
func (e *Engine) PreTradeCheck(params kiteconnect.OrderParams) error {
	// 1. Check Quantity Limit
	if params.Quantity > e.config.MaxQuantity {
		return fmt.Errorf("%w: %d > %d", ErrMaxPositionSizeExceeded, params.Quantity, e.config.MaxQuantity)
	}

	// 2. Mock margin check (in reality, would call Kite /user/margins)
	// margins, err := e.client.GetMargins()
	// ... logic here ...

	// 3. Mock daily loss check
	// positions, err := e.client.GetPositions()
	// ... logic to calculate total PnL ...

	return nil
}

func (e *Engine) UpdateConfig(config RiskConfig) {
	e.config = config
}
