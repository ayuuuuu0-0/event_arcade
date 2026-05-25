package test

import (
	"fmt"
	"time"

	"eventarcade/config"
	"eventarcade/constants"
	"eventarcade/models"
)

func NewSmokeHitEvent(index int, base time.Time) models.Event {
	return models.Event{
		ID:        fmt.Sprintf(EventIDFmtSmoke, index+1),
		Type:      models.EventTypeHit,
		Timestamp: base.Add(time.Duration(index) * time.Millisecond),
		MatchID:   MatchIDSmoke,
		Payload: map[string]any{
			constants.PayloadKeyPlayerID: PlayerIDBotAlpha,
			constants.PayloadKeyDamage:   config.DamageMin,
		},
	}
}
