"use client";

import type { GameEvent } from "../lib/types";

interface EventFeedProps {
  events: GameEvent[];
}

const typeColors: Record<string, string> = {
  hit: "text-[var(--orange)]",
  critical_hit: "text-[var(--red)]",
  dodge: "text-[var(--cyan)]",
  powerup_spawn: "text-[var(--yellow)]",
  match_end: "text-[var(--green)] font-bold",
};

function formatEvent(evt: GameEvent): string {
  const p = evt.payload || {};
  switch (evt.type) {
    case "hit":
      return `${p.attacker} → ${p.target}  dmg:${p.damage}  hp:${p.target_hp}`;
    case "critical_hit":
      return `CRIT ${p.attacker} → ${p.target}  dmg:${p.damage}  hp:${p.target_hp}`;
    case "dodge":
      return `${p.player_id} dodged`;
    case "powerup_spawn":
      return `${p.player_id} powerup!`;
    case "match_end":
      return `MATCH END  winner:${p.winner}`;
    default:
      return evt.type;
  }
}

export default function EventFeed({ events }: EventFeedProps) {
  return (
    <div className="border border-[var(--border)] bg-[var(--panel)] rounded p-3 flex flex-col h-full">
      <div className="text-[10px] text-[var(--dim)] uppercase tracking-wider mb-2 pb-1 border-b border-[var(--border)]">
        Event Stream
      </div>
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 && (
          <div className="text-[var(--dim)] text-center py-8 text-xs">
            waiting for events...
          </div>
        )}
        {events.map((evt, i) => {
          const mid = evt.match_id.slice(-6);
          return (
            <div
              key={`${evt.id}-${i}`}
              className={`py-0.5 border-b border-[#1a1a1a] text-[11px] leading-tight ${
                typeColors[evt.type] || ""
              }`}
            >
              <span className="text-[var(--dim)]">[{mid}]</span>{" "}
              {formatEvent(evt)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
