package models

import "math/rand"

type MatchState struct {
	RNG *rand.Rand
}

type Match struct {
	ID      string
	Seed    int64
	PlayerA *Player
	PlayerB *Player
}

func (m *Match) Players() []*Player {
	return []*Player{m.PlayerA, m.PlayerB}
}
