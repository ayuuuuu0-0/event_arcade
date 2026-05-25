export interface GameEvent {
  id: string;
  type: EventType;
  timestamp: string;
  match_id: string;
  payload?: Record<string, unknown>;
}

export type EventType =
  | "hit"
  | "dodge"
  | "critical_hit"
  | "powerup_spawn"
  | "match_end";

export interface LeaderboardEntry {
  player_id: string;
  score: number;
}

export interface Stats {
  active_matches: number;
  total_events: number;
  events_per_sec: number;
}

export interface ChainData {
  blocks: Block[];
}

export interface Block {
  index: number;
  timestamp: string;
  results: MatchResult[] | null;
  previous_hash: string;
  hash: string;
}

export interface MatchResult {
  match_id: string;
  winner_id: string;
  loser_id: string;
}

export interface CreateMatchResponse {
  match_id: string;
  player_a: string;
  player_b: string;
  mode: string;
  error?: string;
}

export interface LiveMatch {
  id: string;
  players: Record<string, { hp: number }>;
  ended: boolean;
}
