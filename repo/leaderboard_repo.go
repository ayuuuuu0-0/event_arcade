package repo

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"

	"eventarcade/config"
	"eventarcade/constants"
)

// LeaderboardRepo manages player scores and stats in Redis.
type LeaderboardRepo struct {
	client *redis.Client
}

// NewLeaderboardRepo creates a Redis client from REDIS_URL (supports rediss:// for Upstash) or plain host:port.
func NewLeaderboardRepo() *LeaderboardRepo {
	addr := config.RedisAddr()

	var client *redis.Client
	if strings.HasPrefix(addr, "redis://") || strings.HasPrefix(addr, "rediss://") {
		opts, err := redis.ParseURL(addr)
		if err != nil {
			opts = &redis.Options{Addr: addr}
		}
		opts.DialTimeout = 2 * time.Second
		opts.ReadTimeout = 2 * time.Second
		opts.WriteTimeout = 2 * time.Second
		opts.MaxRetries = 0
		opts.PoolSize = 3
		opts.MinIdleConns = 0
		client = redis.NewClient(opts)
	} else {
		client = redis.NewClient(&redis.Options{
			Addr:            addr,
			DB:              config.RedisDB,
			DialTimeout:     1 * time.Second,
			ReadTimeout:     1 * time.Second,
			WriteTimeout:    1 * time.Second,
			MaxRetries:      0,
			PoolSize:        1,
			MinIdleConns:    0,
			DisableIdentity: true,
		})
	}

	return &LeaderboardRepo{client: client}
}

func (r *LeaderboardRepo) Close() error {
	return r.client.Close()
}

func (r *LeaderboardRepo) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

func (r *LeaderboardRepo) IncrementScore(ctx context.Context, playerID string, delta float64) error {
	return r.client.ZIncrBy(ctx, constants.RedisKeyLeaderboardGlobal, delta, playerID).Err()
}

func (r *LeaderboardRepo) RecordWin(ctx context.Context, playerID string) error {
	key := fmt.Sprintf(constants.RedisKeyPlayerStatsPrefix, playerID)
	return r.client.HIncrBy(ctx, key, constants.StatsFieldWins, 1).Err()
}

func (r *LeaderboardRepo) RecordLoss(ctx context.Context, playerID string) error {
	key := fmt.Sprintf(constants.RedisKeyPlayerStatsPrefix, playerID)
	return r.client.HIncrBy(ctx, key, constants.StatsFieldLosses, 1).Err()
}

func (r *LeaderboardRepo) AccumulateDamage(ctx context.Context, playerID string, damage int) error {
	key := fmt.Sprintf(constants.RedisKeyPlayerStatsPrefix, playerID)
	return r.client.HIncrBy(ctx, key, constants.StatsFieldTotalDamage, int64(damage)).Err()
}

func (r *LeaderboardRepo) IncrementHits(ctx context.Context, playerID string) error {
	key := fmt.Sprintf(constants.RedisKeyPlayerStatsPrefix, playerID)
	return r.client.HIncrBy(ctx, key, constants.StatsFieldTotalHits, 1).Err()
}

func (r *LeaderboardRepo) IncrementCrits(ctx context.Context, playerID string) error {
	key := fmt.Sprintf(constants.RedisKeyPlayerStatsPrefix, playerID)
	return r.client.HIncrBy(ctx, key, constants.StatsFieldTotalCrits, 1).Err()
}

func (r *LeaderboardRepo) GetLeaderboard(ctx context.Context, start, stop int64) ([]redis.Z, error) {
	return r.client.ZRevRangeWithScores(ctx, constants.RedisKeyLeaderboardGlobal, start, stop).Result()
}

func (r *LeaderboardRepo) GetPlayerStats(ctx context.Context, playerID string) (map[string]string, error) {
	key := fmt.Sprintf(constants.RedisKeyPlayerStatsPrefix, playerID)
	return r.client.HGetAll(ctx, key).Result()
}
