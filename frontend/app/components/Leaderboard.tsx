"use client";

import type { LeaderboardEntry } from "../lib/types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <div className="border border-[var(--border)] bg-[var(--panel)] rounded p-3 flex flex-col h-full">
      <div className="text-[10px] text-[var(--dim)] uppercase tracking-wider mb-2 pb-1 border-b border-[var(--border)]">
        Leaderboard
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[var(--dim)]">
              <th className="text-left px-1 pb-1 font-normal">#</th>
              <th className="text-left px-1 pb-1 font-normal">Player</th>
              <th className="text-right px-1 pb-1 font-normal">Score</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={3} className="text-[var(--dim)] py-4 text-center">
                  no data
                </td>
              </tr>
            )}
            {entries.slice(0, 20).map((e, i) => (
              <tr
                key={e.player_id}
                className={i === 0 ? "text-[var(--yellow)]" : ""}
              >
                <td className="px-1 py-0.5">{i + 1}</td>
                <td className="px-1 py-0.5 truncate max-w-[140px]">
                  {e.player_id}
                </td>
                <td className="px-1 py-0.5 text-right">{e.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
