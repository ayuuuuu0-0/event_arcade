"use client";

import type { LiveMatch } from "../lib/types";
import HPBar from "./HPBar";

interface MatchCardProps {
  match: LiveMatch;
}

export default function MatchCard({ match }: MatchCardProps) {
  const players = Object.entries(match.players);

  return (
    <div
      className={`bg-[#0d0d0d] border rounded p-2 mb-2 ${
        match.ended ? "border-[var(--green)]" : "border-[var(--border)]"
      }`}
    >
      <div className="text-[9px] text-[var(--dim)] mb-1.5 truncate">
        {match.id}
      </div>
      <div className="flex items-center gap-2">
        {players.length >= 1 && (
          <HPBar name={players[0][0]} hp={players[0][1].hp} />
        )}
        <div className="text-[var(--dim)] text-[10px] flex-shrink-0">VS</div>
        {players.length >= 2 ? (
          <HPBar name={players[1][0]} hp={players[1][1].hp} />
        ) : (
          <div className="flex-1 text-center text-[var(--dim)] text-[10px]">
            ???
          </div>
        )}
      </div>
      {match.ended && (
        <div className="text-center text-[var(--green)] text-[10px] mt-1">
          FINISHED
        </div>
      )}
    </div>
  );
}
