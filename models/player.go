package models

import (
	"math/rand"
	"time"

	"eventarcade/config"
	"eventarcade/constants"
)

type Player struct {
	ID            string
	IsBot         bool
	inputCh       chan Action
	actionTimeout time.Duration
}

func NewPlayer(mode string, playerID string) *Player {
	if mode == constants.ModeBot {
		if len(playerID) == 0 {
			playerID = "bot_unknown"
		}
		return &Player{
			ID:            playerID,
			IsBot:         true,
			inputCh:       nil,
			actionTimeout: config.PlayerActionTimeout,
		}
	}
	return &Player{
		ID:            playerID,
		IsBot:         false,
		inputCh:       make(chan Action, 1),
		actionTimeout: config.PlayerActionTimeout,
	}
}

func (p *Player) GetAction(state MatchState) Action {
	if p.IsBot {
		return rollWeightedAction(state.RNG)
	}
	select {
	case action := <-p.inputCh:
		return action
	case <-time.After(p.actionTimeout):
		return ActionIdle
	}
}

// SendAction is used by the WebSocket handler to push actions into the human player's input channel.
func (p *Player) SendAction(action Action) bool {
	if p.inputCh == nil {
		return false
	}
	select {
	case p.inputCh <- action:
		return true
	default:
		return false
	}
}

func rollWeightedAction(rng *rand.Rand) Action {
	roll := rng.Intn(100)
	hitEnd := config.ProbNothing + config.ProbHit
	dodgeEnd := hitEnd + config.ProbDodge
	critEnd := dodgeEnd + config.ProbCriticalHit
	powerupEnd := critEnd + config.ProbPowerupSpawn

	switch {
	case roll < config.ProbNothing:
		return ActionIdle
	case roll < hitEnd:
		return ActionHit
	case roll < dodgeEnd:
		return ActionDodge
	case roll < critEnd:
		return ActionCriticalHit
	case roll < powerupEnd:
		return ActionPowerupSpawn
	default:
		return ActionIdle
	}
}
