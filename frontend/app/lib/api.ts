import type {
  LeaderboardEntry,
  Stats,
  ChainData,
  CreateMatchResponse,
  GameEvent,
} from "./types";

const API = "http://localhost:8080";

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API}/leaderboard`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API}/stats`);
  if (!res.ok) return { active_matches: 0, total_events: 0, events_per_sec: 0 };
  return res.json();
}

export async function fetchChain(): Promise<ChainData> {
  const res = await fetch(`${API}/chain`);
  if (!res.ok) return { blocks: [] };
  return res.json();
}

export async function fetchMatchEvents(matchId: string): Promise<GameEvent[]> {
  const res = await fetch(`${API}/match/${matchId}/events`);
  if (!res.ok) return [];
  return res.json();
}

export async function createMatch(
  mode: "bot" | "player",
  playerId?: string
): Promise<CreateMatchResponse> {
  const res = await fetch(`${API}/match/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, player_id: playerId || "" }),
  });
  return res.json();
}

export function connectLiveWS(
  onEvent: (evt: GameEvent) => void,
  onStatus: (connected: boolean) => void
): () => void {
  let ws: WebSocket | null = null;
  let closed = false;

  function connect() {
    if (closed) return;
    ws = new WebSocket("ws://localhost:8080/ws/live");
    ws.onopen = () => onStatus(true);
    ws.onclose = () => {
      onStatus(false);
      if (!closed) setTimeout(connect, 2000);
    };
    ws.onmessage = (e) => {
      try {
        onEvent(JSON.parse(e.data));
      } catch {}
    };
  }

  connect();
  return () => {
    closed = true;
    ws?.close();
  };
}

export function connectPlayerWS(
  onMessage: (data: Record<string, string>) => void,
  onStatus: (connected: boolean) => void
): { send: (msg: Record<string, string>) => void; close: () => void } {
  const ws = new WebSocket("ws://localhost:8080/ws");
  ws.onopen = () => onStatus(true);
  ws.onclose = () => onStatus(false);
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {}
  };
  return {
    send: (msg) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    },
    close: () => ws.close(),
  };
}
