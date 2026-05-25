package controllers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"

	"eventarcade/constants"
	"eventarcade/models"
	"eventarcade/service"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WSController struct {
	registry *service.MatchRegistry
}

func NewWSController(registry *service.MatchRegistry) *WSController {
	return &WSController{registry: registry}
}

func (wsc *WSController) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /ws", wsc.handleWS)
}

func (wsc *WSController) handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade: %v", err)
		return
	}
	defer conn.Close()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("ws read: %v", err)
			}
			return
		}

		var payload struct {
			MatchID  string `json:"match_id"`
			PlayerID string `json:"player_id"`
			Action   string `json:"action"`
		}
		if err := json.Unmarshal(msg, &payload); err != nil {
			wsc.sendError(conn, "invalid json")
			continue
		}
		if len(payload.MatchID) == 0 || len(payload.PlayerID) == 0 || len(payload.Action) == 0 {
			wsc.sendError(conn, "match_id, player_id, and action are required")
			continue
		}

		action := models.Action(payload.Action)
		if !isValidAction(action) {
			wsc.sendError(conn, "invalid action: "+payload.Action)
			continue
		}

		player, err := wsc.registry.FindPlayerInMatch(payload.MatchID, payload.PlayerID)
		if err != nil {
			wsc.sendError(conn, err.Error())
			continue
		}

		if ok := player.SendAction(action); !ok {
			wsc.sendError(conn, "action not delivered (bot player or channel full)")
			continue
		}

		resp := map[string]string{
			constants.RequestKeyMatchID:  payload.MatchID,
			constants.RequestKeyPlayerID: payload.PlayerID,
			constants.RequestKeyAction:   payload.Action,
			"status":                     "delivered",
		}
		data, _ := json.Marshal(resp)
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			return
		}
	}
}

func (wsc *WSController) sendError(conn *websocket.Conn, message string) {
	resp := map[string]string{"error": message}
	data, _ := json.Marshal(resp)
	conn.WriteMessage(websocket.TextMessage, data)
}

func isValidAction(action models.Action) bool {
	switch action {
	case models.ActionHit, models.ActionDodge, models.ActionCriticalHit,
		models.ActionPowerupSpawn, models.ActionIdle:
		return true
	}
	return false
}
