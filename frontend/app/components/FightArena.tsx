"use client";

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
  countdown?: number | "FIGHT" | null;
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
  countdown,
}: FightArenaProps) {
  const playerPct = Math.max(0, player.hp);
  const opponentPct = Math.max(0, opponent.hp);

  return (
    <div
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

      {countdown !== null && countdown !== undefined && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none select-none bg-black/40 backdrop-blur-[2px]">
          <div className="flex flex-col items-center mb-3 sm:mb-4 banner-glow">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-[2px] sm:h-[3px] w-8 sm:w-16 md:w-24 bg-gradient-to-r from-transparent via-amber-400 to-yellow-200" />
              <span className="font-arcade text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black italic tracking-[0.25em] uppercase arcade-round-3d">
                ROUND 1
              </span>
              <div className="h-[2px] sm:h-[3px] w-8 sm:w-16 md:w-24 bg-gradient-to-l from-transparent via-amber-400 to-yellow-200" />
            </div>
            <span className="font-arcade text-xs sm:text-sm md:text-base font-black tracking-[0.35em] uppercase mt-1 arcade-ready-glow">
              {countdown === "FIGHT" ? "ENGAGE" : "GET READY"}
            </span>
          </div>

          {typeof countdown === "number" ? (
            <div
              key={countdown}
              className="relative flex items-center justify-center countdown-slam"
            >
              <div className="absolute w-40 h-40 sm:w-56 sm:h-56 rounded-full opacity-35 blur-2xl pointer-events-none bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
              <div className="font-arcade text-8xl sm:text-9xl md:text-[10rem] font-black italic tracking-wider arcade-gold-3d">
                {countdown}
              </div>
            </div>
          ) : (
            <div
              key="fight"
              className="relative w-full flex items-center justify-center fight-slam"
            >
              <div className="absolute inset-x-0 h-20 sm:h-24 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-300 to-transparent pointer-events-none" />
              <div className="font-arcade text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black italic uppercase tracking-[0.18em] arcade-fight-3d">
                FIGHT!
              </div>
            </div>
          )}
        </div>
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
              {matchId ? matchId.slice(-8) : "STANDBY"}
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
              <div className="font-arcade text-5xl sm:text-6xl font-black italic uppercase tracking-[0.25em] arcade-fight-3d">
                K.O.
              </div>
              <div className="font-arcade text-amber-200 text-lg sm:text-xl font-bold tracking-widest mt-1">
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
