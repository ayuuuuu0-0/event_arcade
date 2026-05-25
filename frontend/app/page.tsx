"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { LeaderboardEntry, Stats, GameEvent, LiveMatch } from "./lib/types";
import {
  fetchLeaderboard,
  fetchStats,
  fetchChain,
  createMatch,
  connectLiveWS,
} from "./lib/api";
import MetricCard from "./components/MetricCard";
import Leaderboard from "./components/Leaderboard";
import MatchCard from "./components/MatchCard";
import EventFeed from "./components/EventFeed";

const MAX_FEED = 150;

export default function DashboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<Stats>({
    active_matches: 0,
    total_events: 0,
    events_per_sec: 0,
  });
  const [chainBlocks, setChainBlocks] = useState(0);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const matchesRef = useRef<Record<string, LiveMatch>>({});
  const [matchList, setMatchList] = useState<LiveMatch[]>([]);

  const handleEvent = useCallback((evt: GameEvent) => {
    setEvents((prev) => {
      const next = [evt, ...prev];
      return next.length > MAX_FEED ? next.slice(0, MAX_FEED) : next;
    });

    const matches = matchesRef.current;
    const mid = evt.match_id;
    if (!mid) return;

    if (!matches[mid]) {
      matches[mid] = { id: mid, players: {}, ended: false };
    }
    const m = matches[mid];
    const p = evt.payload || {};

    if (evt.type === "hit" || evt.type === "critical_hit") {
      const atk = (p.attacker as string) || "";
      const tgt = (p.target as string) || "";
      if (atk && !m.players[atk]) m.players[atk] = { hp: 100 };
      if (tgt) {
        if (!m.players[tgt]) m.players[tgt] = { hp: 100 };
        m.players[tgt].hp =
          typeof p.target_hp === "number" ? p.target_hp : m.players[tgt].hp;
      }
    } else if (evt.type === "dodge" || evt.type === "powerup_spawn") {
      const pid = (p.player_id as string) || "";
      if (pid && !m.players[pid]) m.players[pid] = { hp: 100 };
    } else if (evt.type === "match_end") {
      m.ended = true;
      setTimeout(() => {
        delete matches[mid];
        setMatchList(Object.values({ ...matches }));
      }, 4000);
    }

    setMatchList(Object.values({ ...matches }));
  }, []);

  useEffect(() => {
    const disconnect = connectLiveWS(handleEvent, setConnected);
    return disconnect;
  }, [handleEvent]);

  useEffect(() => {
    const poll = () => {
      fetchLeaderboard().then(setLeaderboard);
      fetchStats().then(setStats);
      fetchChain().then((c) => setChainBlocks(c.blocks?.length || 0));
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  const spawnMatch = async () => {
    await createMatch("bot");
  };

  const spawnBatch = async () => {
    for (let i = 0; i < 5; i++) await createMatch("bot");
  };

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-80px)]">
      <div className="flex gap-3">
        <MetricCard label="Active Matches" value={stats.active_matches} />
        <MetricCard label="Total Events" value={stats.total_events} />
        <MetricCard label="Events / sec" value={stats.events_per_sec} />
        <MetricCard label="Chain Blocks" value={chainBlocks} />
      </div>

      <div className="grid grid-cols-[280px_1fr_320px] gap-3 flex-1 min-h-0">
        <Leaderboard entries={leaderboard} />

        <div className="border border-[var(--border)] bg-[var(--panel)] rounded p-3 flex flex-col">
          <div className="text-[10px] text-[var(--dim)] uppercase tracking-wider mb-2 pb-1 border-b border-[var(--border)]">
            Live Matches
          </div>
          <div className="flex-1 overflow-y-auto">
            {matchList.length === 0 ? (
              <div className="text-[var(--dim)] text-center py-12 text-xs">
                No active matches
              </div>
            ) : (
              matchList.map((m) => <MatchCard key={m.id} match={m} />)
            )}
          </div>
        </div>

        <EventFeed events={events} />
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--border)] pt-3">
        <button
          onClick={spawnMatch}
          className="bg-[var(--green)] text-black px-4 py-1.5 text-xs font-bold rounded hover:bg-[var(--dim)] uppercase"
        >
          + Bot Match
        </button>
        <button
          onClick={spawnBatch}
          className="bg-[#222] text-[var(--green)] border border-[var(--green)] px-4 py-1.5 text-xs font-bold rounded hover:bg-[var(--green)] hover:text-black uppercase"
        >
          + 5 Matches
        </button>
        <span className="ml-auto text-[10px]">
          {connected ? (
            <span className="text-[var(--green)]">● LIVE</span>
          ) : (
            <span className="text-[var(--red)]">● DISCONNECTED</span>
          )}
        </span>
      </div>
    </div>
  );
}
