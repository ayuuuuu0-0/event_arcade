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
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none select-none bg-black/35 backdrop-blur-[2px]">
          <div className="flex flex-col items-center mb-2 banner-glow">
            <span
              className="text-xs sm:text-sm md:text-base font-black tracking-[0.4em] uppercase text-[#00ffff]"
              style={{
                textShadow:
                  "0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 40px #0088ff",
              }}
            >
              ROUND 1
            </span>
            <span
              className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.3em] uppercase text-[#ffff00] mt-0.5"
              style={{
                textShadow: "0 0 8px #ffff00, 0 0 16px #ff8800",
              }}
            >
              {countdown === "FIGHT" ? "ENGAGE" : "GET READY"}
            </span>
          </div>

          {typeof countdown === "number" ? (
            <div
              key={countdown}
              className="relative flex items-center justify-center countdown-slam"
            >
              <div
                className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full opacity-35 blur-xl pointer-events-none"
                style={{
                  backgroundColor:
                    countdown === 3
                      ? "#ffff00"
                      : countdown === 2
                      ? "#ff8800"
                      : "#ff2244",
                }}
              />
              <div
                className="text-7xl sm:text-8xl md:text-9xl font-black italic tracking-tighter"
                style={{
                  color:
                    countdown === 3
                      ? "#ffff00"
                      : countdown === 2
                      ? "#ffaa00"
                      : "#ff3344",
                  textShadow:
                    countdown === 3
                      ? "0 0 20px #ffff00, 0 0 45px #ff8800, 0 0 80px #ff4400"
                      : countdown === 2
                      ? "0 0 20px #ffaa00, 0 0 45px #ff5500, 0 0 80px #ff2200"
                      : "0 0 25px #ff3344, 0 0 50px #ff0044, 0 0 90px #ff0000",
                  WebkitTextStroke: "2px rgba(255, 255, 255, 0.4)",
                }}
              >
                {countdown}
              </div>
            </div>
          ) : (
            <div
              key="fight"
              className="relative w-full flex items-center justify-center fight-slam"
            >
              <div className="absolute inset-x-0 h-16 sm:h-20 bg-gradient-to-r from-transparent via-[#00ff88]/25 to-transparent pointer-events-none" />
              <div
                className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black italic uppercase tracking-[0.2em]"
                style={{
                  color: "#00ff88",
                  textShadow:
                    "0 0 20px #00ff88, 0 0 40px #00ffff, 0 0 70px #00ff88, 0 0 100px #00ffff",
                  WebkitTextStroke: "2px #ffffff",
                }}
              >
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
