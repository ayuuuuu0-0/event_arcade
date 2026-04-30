package models

import (
	"math/rand"
	"time"
)

type Action string

const (
	ActionHit         Action = "hit"
	ActionDodge       Action = "dodge"
	ActionCriticalHit Action = "critical_hit"
	ActionIdle        Action = "idle"
)

type Player struct {
	ID      string        `json:"id"`
	InputCh chan Action   // Channel for receiving real-time actions from a WebSocket (for humans)
	Timeout time.Duration // Max time the engine will wait for human input before falling back
	IsBot   bool
	RNG     *rand.Rand // Seeded random number generator
}

// GetAction is called on every Player every tick. For bots, it returns a random action instantly. For humans, it waits for input on the channel or falls back.
func (p *Player) GetAction(state MatchState) Action {
	if p.IsBot {
		roll := p.RNG.Intn(100)

		return ActionIdle
	}
	// For physical players, listen from the websocket channel
	select {
	case action := <-p.InputCh:
		return action
	case <-time.After(p.Timeout):
		return ActionIdle
	}
}
