package config

import (
	"os"
	"time"
)

const (
	StartingHP = 100

	DamageMin = 5
	DamageMax = 15

	CritMultiplier = 2.0

	MaxPowerupsPerMatch = 2

	MatchTickCount = 200

	ParallelMatchCount = 5

	EventLogPath = "events.log"

	ProbHit          = 38
	ProbDodge        = 18
	ProbCriticalHit  = 14
	ProbPowerupSpawn = 10
	ProbNothing      = 20

	InboundChannelBuffer    = 1000
	SubscriberChannelBuffer = 1000

	RedisDB = 0

	BlockBatchSize = 3
	ChainFilePath  = "chain.json"
)

var (
	TickDuration        = 200 * time.Millisecond
	PlayerActionTimeout = 250 * time.Millisecond
)

// RedisAddr returns the Redis address from REDIS_URL env var, falling back to localhost.
// Supports both plain host:port and full redis:// / rediss:// URLs.
func RedisAddr() string {
	if url := os.Getenv("REDIS_URL"); len(url) > 0 {
		return url
	}
	return "localhost:6379"
}

// ServerPort returns the listen address from PORT env var, falling back to :8080.
func ServerPort() string {
	if port := os.Getenv("PORT"); len(port) > 0 {
		return ":" + port
	}
	return ":8080"
}
