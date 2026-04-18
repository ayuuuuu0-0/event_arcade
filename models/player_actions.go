package models

import (
	"math/rand"
	"time"
)

type Actions struct {
	Hit         string `json:"hit"`
	Dodge       string `json:"dodge"`
	CriticalHit string `json:"critical_hit"`
	Idle        string `json:"idle"`
	ActionId    string `json:"action_id"`
}

type Player struct {
	ID      string        `json:"id"`
	inputCh chan Actions  // explain me need of this and how channel wil work here
	timeout time.Duration // explain me need oif this
}

type Bot struct {
	ID  string    `json:"id"`
	RNG rand.Rand `json:"rng"`
}
