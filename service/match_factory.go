package service

import (
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"hash/fnv"
	"time"

	"eventarcade/constants"
	"eventarcade/models"
)

func NewMatch(mode string, humanPlayerID string) (*models.Match, error) {
	if len(mode) == 0 {
		return nil, fmt.Errorf("match mode is required")
	}

	matchID, err := newMatchID()
	if err != nil {
		return nil, err
	}

	seed := seedFromMatchID(matchID, time.Now().UTC())

	var playerA, playerB *models.Player
	switch mode {
	case constants.ModeBot:
		playerA = models.NewPlayer(constants.ModeBot, botNameFromSeed(seed, 0))
		playerB = models.NewPlayer(constants.ModeBot, botNameFromSeed(seed, 1))
	case constants.ModePlayer:
		if len(humanPlayerID) == 0 {
			return nil, fmt.Errorf("human player id is required for player mode")
		}
		playerA = models.NewPlayer(constants.ModePlayer, humanPlayerID)
		playerB = models.NewPlayer(constants.ModeBot, botNameFromSeed(seed, 1))
	default:
		return nil, fmt.Errorf("unknown match mode %q", mode)
	}

	return &models.Match{
		ID:      matchID,
		Seed:    seed,
		PlayerA: playerA,
		PlayerB: playerB,
	}, nil
}

func newMatchID() (string, error) {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", fmt.Errorf("generate match id: %w", err)
	}
	return fmt.Sprintf("match_%x", b), nil
}

func seedFromMatchID(matchID string, ts time.Time) int64 {
	h := fnv.New64a()
	_, _ = h.Write([]byte(matchID))
	_, _ = h.Write([]byte(ts.Format(time.RFC3339Nano)))
	return int64(h.Sum64())
}

func botNameFromSeed(seed int64, slot int) string {
	var b [8]byte
	binary.BigEndian.PutUint64(b[:], uint64(seed+int64(slot)))
	return fmt.Sprintf("bot_%x", b[:4])
}
