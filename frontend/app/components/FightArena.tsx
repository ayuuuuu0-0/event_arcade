"use client";

import { useEffect, useState } from "react";
import type { Character } from "../lib/characters";
import type { FighterAnimState } from "../lib/animations";
import FighterSprite from "./FighterSprite";
import ActionWheel from "./ActionWheel";

interface PlayerState {
  character: Character;
  hp: number;
  animState: FighterAnimState;
  animKey: number;
}

interface FightArenaProps {
  player: PlayerState;
  opponent: PlayerState;
  matchId: string;
  onAction: (action: string) => void;
  actionsDisabled: boolean;
  matchEnded: boolean;
  winner?: string;
  screenShake: boolean;
  showImpact: "left" | "right" | null;
  arenaImage: string;
}

export default function FightArena({
  player,
  opponent,
  matchId,
  onAction,
  actionsDisabled,
  matchEnded,
  winner,
  screenShake,
  showImpact,
  arenaImage,
}: FightArenaProps) {
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    if (screenShake) setShakeKey((k) => k + 1);
  }, [screenShake]);

  const playerPct = Math.max(0, player.hp);
  const opponentPct = Math.max(0, opponent.hp);

  return (
    <div
      key={shakeKey}
      className={`relative w-full rounded-xl overflow-hidden ${
        screenShake ? "arena-shake" : ""
      }`}
      style={{ aspectRatio: "16/9" }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${arenaImage}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {showImpact && (
        <div
          className="absolute z-30 impact-burst pointer-events-none"
          style={{
            width: 120,
            height: 120,
            top: "40%",
            left: showImpact === "right" ? "60%" : "30%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,200,50,0.6) 40%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start px-4 pt-3">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: player.character.color }}
              />
              <div
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: player.character.color }}
              >
                {player.character.name}
              </div>
            </div>
            <div className="h-3 bg-black/60 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${playerPct}%`,
                  backgroundColor:
                    playerPct < 30
                      ? "#ff4444"
                      : playerPct < 60
                      ? "#ff8800"
                      : player.character.color,
                  boxShadow: `0 0 8px ${playerPct < 30 ? "#ff4444" : player.character.color}`,
                }}
              />
            </div>
            <div className="text-white/80 text-[10px] font-bold mt-0.5">
              {player.hp} / 100
            </div>
          </div>

          <div className="bg-black/70 backdrop-blur-sm rounded px-3 py-1.5 border border-white/10 text-center">
            <div className="text-[8px] text-white/40 uppercase tracking-wider">
              Match
            </div>
            <div className="text-[var(--cyan)] text-xs font-mono font-bold">
              {matchId.slice(-8)}
            </div>
          </div>

          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10 min-w-[200px] text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <div
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: opponent.character.color }}
              >
                {opponent.character.name}
              </div>
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: opponent.character.color }}
              />
            </div>
            <div className="h-3 bg-black/60 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-500 float-right"
                style={{
                  width: `${opponentPct}%`,
                  backgroundColor:
                    opponentPct < 30
                      ? "#ff4444"
                      : opponentPct < 60
                      ? "#ff8800"
                      : opponent.character.color,
                  boxShadow: `0 0 8px ${opponentPct < 30 ? "#ff4444" : opponent.character.color}`,
                }}
              />
            </div>
            <div className="text-white/80 text-[10px] font-bold mt-0.5">
              {opponent.hp} / 100
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-end justify-between px-6 pb-2">
          <div className="flex-1 flex justify-center -mr-16">
            <FighterSprite
              character={player.character}
              side="left"
              animState={player.animState}
              animKey={player.animKey}
            />
          </div>

          <div className="flex-1 flex justify-center -ml-16">
            <FighterSprite
              character={opponent.character}
              side="right"
              animState={opponent.animState}
              animKey={opponent.animKey}
            />
          </div>
        </div>

        <div className="flex justify-between items-end px-4 pb-3">
          <ActionWheel
            onAction={onAction}
            disabled={actionsDisabled || matchEnded}
            side="left"
          />

          {matchEnded && (
            <div className="flex-1 text-center pb-4">
              <div
                className="text-4xl font-bold uppercase tracking-[0.3em]"
                style={{
                  color: "#ffff00",
                  textShadow:
                    "0 0 20px #ffff00, 0 0 40px #ff8800, 0 0 60px #ff4400",
                }}
              >
                K.O.
              </div>
              <div className="text-white text-lg font-bold mt-1">
                {winner} WINS!
              </div>
            </div>
          )}

          <div className="text-right self-end pb-1">
            <div className="text-[8px] text-white/30 uppercase tracking-wider">
              A W S E Space
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
