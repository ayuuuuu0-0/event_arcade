package workers

import (
	"context"
	"log"

	"eventarcade/constants"
	"eventarcade/models"
	"eventarcade/repo"
)

// RunEventConsumer processes events from a fan-out subscriber channel
// and updates Redis leaderboard + player stats. It is stateless and idempotent.
func RunEventConsumer(ctx context.Context, events <-chan models.Event, leaderboard *repo.LeaderboardRepo) {
	for {
		select {
		case <-ctx.Done():
			return
		case evt, ok := <-events:
			if !ok {
				return
			}
			processEvent(ctx, evt, leaderboard)
		}
	}
}

func processEvent(ctx context.Context, evt models.Event, leaderboard *repo.LeaderboardRepo) {
	switch evt.Type {
	case models.EventTypeHit:
		processHit(ctx, evt, leaderboard)
	case models.EventTypeCriticalHit:
		processCriticalHit(ctx, evt, leaderboard)
	case models.EventTypeMatchEnd:
		processMatchEnd(ctx, evt, leaderboard)
	}
}

func processHit(ctx context.Context, evt models.Event, leaderboard *repo.LeaderboardRepo) {
	attacker, _ := evt.Payload[constants.PayloadKeyAttacker].(string)
	damage, _ := evt.Payload[constants.PayloadKeyDamage].(int)
	if damage == 0 {
		if f, ok := evt.Payload[constants.PayloadKeyDamage].(float64); ok {
			damage = int(f)
		}
	}
	if len(attacker) == 0 {
		return
	}
	if err := leaderboard.AccumulateDamage(ctx, attacker, damage); err != nil {
		log.Printf("event consumer: accumulate damage: %v", err)
	}
	if err := leaderboard.IncrementHits(ctx, attacker); err != nil {
		log.Printf("event consumer: increment hits: %v", err)
	}
}

func processCriticalHit(ctx context.Context, evt models.Event, leaderboard *repo.LeaderboardRepo) {
	processHit(ctx, evt, leaderboard)

	attacker, _ := evt.Payload[constants.PayloadKeyAttacker].(string)
	if len(attacker) == 0 {
		return
	}
	if err := leaderboard.IncrementCrits(ctx, attacker); err != nil {
		log.Printf("event consumer: increment crits: %v", err)
	}
}

func processMatchEnd(ctx context.Context, evt models.Event, leaderboard *repo.LeaderboardRepo) {
	winner, _ := evt.Payload[constants.PayloadKeyWinner].(string)
	loser, _ := evt.Payload[constants.PayloadKeyLoser].(string)

	if len(winner) > 0 {
		if err := leaderboard.IncrementScore(ctx, winner, 1); err != nil {
			log.Printf("event consumer: increment winner score: %v", err)
		}
		if err := leaderboard.RecordWin(ctx, winner); err != nil {
			log.Printf("event consumer: record win: %v", err)
		}
	}
	if len(loser) > 0 {
		if err := leaderboard.RecordLoss(ctx, loser); err != nil {
			log.Printf("event consumer: record loss: %v", err)
		}
	}
}
