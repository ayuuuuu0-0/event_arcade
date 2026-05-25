package controllers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"

	"eventarcade/models"
	"eventarcade/service"
)

type DashboardController struct {
	registry   *service.MatchRegistry
	mu         sync.Mutex
	clients    map[*websocket.Conn]struct{}
	totalEvents atomic.Uint64
	recentEvents atomic.Int64
}

func NewDashboardController(registry *service.MatchRegistry) *DashboardController {
	return &DashboardController{
		registry: registry,
		clients:  make(map[*websocket.Conn]struct{}),
	}
}

func (dc *DashboardController) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /ws/live", dc.handleLiveStream)
	mux.HandleFunc("GET /stats", dc.handleStats)
}

// RunBroadcaster reads events from a fan-out subscriber channel and pushes
// them to every connected dashboard WebSocket client.
func (dc *DashboardController) RunBroadcaster(ctx context.Context, events <-chan models.Event) {
	var windowCount int64
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			dc.recentEvents.Store(windowCount)
			windowCount = 0
		case evt, ok := <-events:
			if !ok {
				return
			}
			dc.totalEvents.Add(1)
			windowCount++
			dc.broadcast(evt)
		}
	}
}

func (dc *DashboardController) TotalEvents() uint64 {
	return dc.totalEvents.Load()
}

func (dc *DashboardController) EventsPerSec() int64 {
	return dc.recentEvents.Load()
}

func (dc *DashboardController) handleLiveStream(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("dashboard ws upgrade: %v", err)
		return
	}

	dc.mu.Lock()
	dc.clients[conn] = struct{}{}
	dc.mu.Unlock()

	defer func() {
		dc.mu.Lock()
		delete(dc.clients, conn)
		dc.mu.Unlock()
		conn.Close()
	}()

	// keep connection alive — read loop discards client messages
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (dc *DashboardController) handleStats(w http.ResponseWriter, r *http.Request) {
	stats := map[string]any{
		"active_matches": dc.registry.ActiveCount(),
		"total_events":   dc.totalEvents.Load(),
		"events_per_sec": dc.recentEvents.Load(),
	}
	writeJSON(w, http.StatusOK, stats)
}

func (dc *DashboardController) broadcast(evt models.Event) {
	data, err := json.Marshal(evt)
	if err != nil {
		return
	}

	dc.mu.Lock()
	clients := make([]*websocket.Conn, 0, len(dc.clients))
	for c := range dc.clients {
		clients = append(clients, c)
	}
	dc.mu.Unlock()

	for _, c := range clients {
		if err := c.WriteMessage(websocket.TextMessage, data); err != nil {
			dc.mu.Lock()
			delete(dc.clients, c)
			dc.mu.Unlock()
			c.Close()
		}
	}
}
