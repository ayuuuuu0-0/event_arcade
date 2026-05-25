package service

import (
	"fmt"
	"sync"

	"eventarcade/models"
)

type MatchRegistry struct {
	mu      sync.RWMutex
	matches map[string]*models.Match
}

func NewMatchRegistry() *MatchRegistry {
	return &MatchRegistry{
		matches: make(map[string]*models.Match),
	}
}

func (r *MatchRegistry) Register(match *models.Match) {
	r.mu.Lock()
	r.matches[match.ID] = match
	r.mu.Unlock()
}

func (r *MatchRegistry) Remove(matchID string) {
	r.mu.Lock()
	delete(r.matches, matchID)
	r.mu.Unlock()
}

func (r *MatchRegistry) Get(matchID string) (*models.Match, error) {
	r.mu.RLock()
	m, ok := r.matches[matchID]
	r.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("match %q not found", matchID)
	}
	return m, nil
}

func (r *MatchRegistry) FindPlayerInMatch(matchID string, playerID string) (*models.Player, error) {
	match, err := r.Get(matchID)
	if err != nil {
		return nil, err
	}
	for _, p := range match.Players() {
		if p.ID == playerID {
			return p, nil
		}
	}
	return nil, fmt.Errorf("player %q not in match %q", playerID, matchID)
}

func (r *MatchRegistry) ActiveCount() int {
	r.mu.RLock()
	n := len(r.matches)
	r.mu.RUnlock()
	return n
}
