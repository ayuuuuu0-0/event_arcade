package constants

const (
	RedisKeyLeaderboardGlobal = "leaderboard:global"
	RedisKeyPlayerStatsPrefix = "player:%s:stats"

	StatsFieldWins        = "wins"
	StatsFieldLosses      = "losses"
	StatsFieldTotalDamage = "total_damage"
	StatsFieldTotalHits   = "total_hits"
	StatsFieldTotalCrits  = "total_crits"
)
