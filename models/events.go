package models

import "time"

type Event struct {
	ID        string    `json:"id"`
	Type      EventType `json:"type"`
	TimeStamp time.Time `json:"timestamp"`
	MatchID   string    `json:"match_id"`
	Actions   Actions   `json:"actions"`
}

type EventType struct {
}
