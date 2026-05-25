package models

import "time"

type EventType string

const (
	EventTypeHit          EventType = "hit"
	EventTypeDodge        EventType = "dodge"
	EventTypeCriticalHit  EventType = "critical_hit"
	EventTypePowerupSpawn EventType = "powerup_spawn"
	EventTypeMatchEnd     EventType = "match_end"
)

type Action string

const (
	ActionHit          Action = "hit"
	ActionDodge        Action = "dodge"
	ActionCriticalHit  Action = "critical_hit"
	ActionPowerupSpawn Action = "powerup_spawn"
	ActionIdle         Action = "idle"
)

type Event struct {
	ID        string         `json:"id"`
	Type      EventType      `json:"type"`
	Timestamp time.Time      `json:"timestamp"`
	MatchID   string         `json:"match_id"`
	Payload   map[string]any `json:"payload,omitempty"`
}
