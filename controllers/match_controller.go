package controllers

import (
	"bufio"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"eventarcade/blockchain"
	"eventarcade/config"
	"eventarcade/constants"
	"eventarcade/models"
	"eventarcade/repo"
	"eventarcade/service"
)

type MatchController struct {
	registry    *service.MatchRegistry
	leaderboard *repo.LeaderboardRepo
	logInbound  chan<- models.Event
}

func NewMatchController(
	registry *service.MatchRegistry,
	leaderboard *repo.LeaderboardRepo,
	logInbound chan<- models.Event,
) *MatchController {
	return &MatchController{
		registry:    registry,
		leaderboard: leaderboard,
		logInbound:  logInbound,
	}
}

func (mc *MatchController) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /match/create", mc.handleCreateMatch)
	mux.HandleFunc("GET /leaderboard", mc.handleGetLeaderboard)
	mux.HandleFunc("GET /chain", mc.handleGetChain)
	mux.HandleFunc("GET /match/{id}/events", mc.handleGetMatchEvents)
}

func (mc *MatchController) handleCreateMatch(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Mode     string `json:"mode"`
		PlayerID string `json:"player_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if len(body.Mode) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "mode is required"})
		return
	}
	if body.Mode == constants.ModePlayer && len(body.PlayerID) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "player_id is required for player mode"})
		return
	}

	match, err := service.NewMatch(body.Mode, body.PlayerID)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	mc.registry.Register(match)

	go func() {
		ctx := context.Background()
		if err := service.RunMatch(ctx, match, mc.logInbound); err != nil {
			log.Printf("match %s: %v", match.ID, err)
		}
		mc.registry.Remove(match.ID)
	}()

	writeJSON(w, http.StatusCreated, map[string]string{
		"match_id":   match.ID,
		"player_a":   match.PlayerA.ID,
		"player_b":   match.PlayerB.ID,
		"mode":       body.Mode,
	})
}

func (mc *MatchController) handleGetLeaderboard(w http.ResponseWriter, r *http.Request) {
	results, err := mc.leaderboard.GetLeaderboard(r.Context(), 0, -1)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to read leaderboard"})
		return
	}

	type entry struct {
		PlayerID string  `json:"player_id"`
		Score    float64 `json:"score"`
	}
	entries := make([]entry, 0, len(results))
	for _, z := range results {
		entries = append(entries, entry{
			PlayerID: z.Member.(string),
			Score:    z.Score,
		})
	}
	writeJSON(w, http.StatusOK, entries)
}

func (mc *MatchController) handleGetChain(w http.ResponseWriter, r *http.Request) {
	chain, err := blockchain.LoadChain(config.ChainFilePath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load chain"})
		return
	}
	writeJSON(w, http.StatusOK, chain)
}

func (mc *MatchController) handleGetMatchEvents(w http.ResponseWriter, r *http.Request) {
	matchID := r.PathValue("id")
	if len(matchID) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "match id is required"})
		return
	}

	events, err := readEventsForMatch(config.EventLogPath, matchID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to read events"})
		return
	}
	writeJSON(w, http.StatusOK, events)
}

func readEventsForMatch(path string, matchID string) ([]models.Event, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	defer f.Close()

	var events []models.Event
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		var evt models.Event
		if err := json.Unmarshal(line, &evt); err != nil {
			continue
		}
		if evt.MatchID == matchID {
			events = append(events, evt)
		}
	}
	return events, scanner.Err()
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("write response: %v", err)
	}
}
