package service

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"eventarcade/config"
	"eventarcade/constants"
	"eventarcade/models"
)

type arena struct {
	rng           *rand.Rand
	hp            map[string]int
	dodging       map[string]bool
	powerupSpawns int
	eventSeq      int
}

func RunMatch(ctx context.Context, match *models.Match, events chan<- models.Event) error {
	if match == nil {
		return fmt.Errorf("match is nil")
	}

	rng := rand.New(rand.NewSource(match.Seed))
	state := &arena{
		rng:     rng,
		hp:      make(map[string]int),
		dodging: make(map[string]bool),
	}
	for _, p := range match.Players() {
		state.hp[p.ID] = config.StartingHP
	}

	ticker := time.NewTicker(config.TickDuration)
	defer ticker.Stop()

	for tick := 0; tick < config.MatchTickCount; tick++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			state.clearDodging()
			matchState := models.MatchState{RNG: rng}

			for _, player := range match.Players() {
				action := player.GetAction(matchState)
				if ended := state.applyAction(ctx, match, player, action, events); ended {
					return nil
				}
			}
		}
	}

	return state.endMatchByTimeout(ctx, match, events)
}

func (a *arena) clearDodging() {
	for id := range a.dodging {
		a.dodging[id] = false
	}
}

func (a *arena) opponent(match *models.Match, player *models.Player) *models.Player {
	if player.ID == match.PlayerA.ID {
		return match.PlayerB
	}
	return match.PlayerA
}

func (a *arena) applyAction(
	ctx context.Context,
	match *models.Match,
	actor *models.Player,
	action models.Action,
	events chan<- models.Event,
) bool {
	switch action {
	case models.ActionIdle:
		return false
	case models.ActionDodge:
		a.dodging[actor.ID] = true
		a.emit(ctx, events, match.ID, models.EventTypeDodge, map[string]any{
			constants.PayloadKeyPlayerID: actor.ID,
		})
		return false
	case models.ActionPowerupSpawn:
		if a.powerupSpawns >= config.MaxPowerupsPerMatch {
			return false
		}
		a.powerupSpawns++
		a.emit(ctx, events, match.ID, models.EventTypePowerupSpawn, map[string]any{
			constants.PayloadKeyPlayerID: actor.ID,
		})
		return false
	case models.ActionHit, models.ActionCriticalHit:
		target := a.opponent(match, actor)
		if a.dodging[target.ID] {
			return false
		}
		damage := a.rollDamage()
		if action == models.ActionCriticalHit {
			damage = int(float64(damage) * config.CritMultiplier)
		}
		a.hp[target.ID] -= damage
		if a.hp[target.ID] < 0 {
			a.hp[target.ID] = 0
		}
		eventType := models.EventTypeHit
		if action == models.ActionCriticalHit {
			eventType = models.EventTypeCriticalHit
		}
		a.emit(ctx, events, match.ID, eventType, map[string]any{
			constants.PayloadKeyAttacker: actor.ID,
			constants.PayloadKeyTarget:   target.ID,
			constants.PayloadKeyDamage:   damage,
			constants.PayloadKeyTargetHP: a.hp[target.ID],
		})
		if a.hp[target.ID] == 0 {
			return a.emitMatchEnd(ctx, match, events, actor.ID, target.ID)
		}
		return false
	default:
		return false
	}
}

func (a *arena) rollDamage() int {
	if config.DamageMax <= config.DamageMin {
		return config.DamageMin
	}
	span := config.DamageMax - config.DamageMin + 1
	return config.DamageMin + a.rng.Intn(span)
}

func (a *arena) emitMatchEnd(
	ctx context.Context,
	match *models.Match,
	events chan<- models.Event,
	winnerID, loserID string,
) bool {
	a.emit(ctx, events, match.ID, models.EventTypeMatchEnd, map[string]any{
		constants.PayloadKeyWinner: winnerID,
		constants.PayloadKeyLoser:  loserID,
	})
	return true
}

func (a *arena) endMatchByTimeout(
	ctx context.Context,
	match *models.Match,
	events chan<- models.Event,
) error {
	winnerID := match.PlayerA.ID
	loserID := match.PlayerB.ID
	if a.hp[match.PlayerA.ID] < a.hp[match.PlayerB.ID] {
		winnerID = match.PlayerB.ID
		loserID = match.PlayerA.ID
	} else if a.hp[match.PlayerA.ID] == a.hp[match.PlayerB.ID] {
		winnerID = match.PlayerA.ID
		loserID = match.PlayerB.ID
	}
	a.emitMatchEnd(ctx, match, events, winnerID, loserID)
	return nil
}

func (a *arena) emit(
	ctx context.Context,
	events chan<- models.Event,
	matchID string,
	eventType models.EventType,
	payload map[string]any,
) {
	a.eventSeq++
	evt := models.Event{
		ID:        fmt.Sprintf("%s_e%d", matchID, a.eventSeq),
		Type:      eventType,
		Timestamp: time.Now().UTC(),
		MatchID:   matchID,
		Payload:   payload,
	}
	select {
	case events <- evt:
	case <-ctx.Done():
	}
}
