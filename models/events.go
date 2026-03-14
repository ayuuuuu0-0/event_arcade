package models

import "time"

type Event struct {
	ID        string         `json:"id"`
	Type      string         `json:"type"`
	Timestamp time.Time      `json:"timestamp"`
	MatchID   string         `json:"match_id"`
	Payload   map[string]any `json:"payload"`
}

