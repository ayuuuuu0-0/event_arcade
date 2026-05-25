"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GameEvent } from "../lib/types";
import type { Character } from "../lib/characters";
import type { FighterAnimState } from "../lib/animations";
import { getRandomCharacter } from "../lib/characters";
import { getRandomArena } from "../lib/arenas";
import { createMatch, connectLiveWS, connectPlayerWS } from "../lib/api";
import CharacterSelect from "../components/CharacterSelect";
import FightArena from "../components/FightArena";

type Phase = "select" | "fighting" | "ended";

const ACTION_KEYS: Record<string, string> = {
  a: "hit",
  w: "dodge",
  s: "critical_hit",
  e: "powerup_spawn",
  " ": "idle",
  "1": "hit",
  "2": "dodge",
  "3": "critical_hit",
  "4": "powerup_spawn",
  "5": "idle",
};

const ANIM_DURATION = 600;

export default function PlayPage() {
  const [phase, setPhase] = useState<Phase>("select");
  const [playerChar, setPlayerChar] = useState<Character | null>(null);
  const [opponentChar, setOpponentChar] = useState<Character | null>(null);
  const [matchId, setMatchId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [opponentId, setOpponentId] = useState("");
  const [playerHP, setPlayerHP] = useState(100);
  const [opponentHP, setOpponentHP] = useState(100);
  const [playerAnim, setPlayerAnim] = useState<FighterAnimState>("idle");
  const [opponentAnim, setOpponentAnim] = useState<FighterAnimState>("idle");
  const [playerAnimKey, setPlayerAnimKey] = useState(0);
  const [opponentAnimKey, setOpponentAnimKey] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [winner, setWinner] = useState<string>();
  const [screenShake, setScreenShake] = useState(false);
  const [showImpact, setShowImpact] = useState<"left" | "right" | null>(null);
  const [arenaImage, setArenaImage] = useState("/arena/neon_ring.png");
  const [actionCooldown, setActionCooldown] = useState(false);
  const [log, setLog] = useState<{ msg: string; type: string }[]>([]);

  const playerWS = useRef<ReturnType<typeof connectPlayerWS> | null>(null);
  const matchIdRef = useRef("");
  const playerIdRef = useRef("");
  const playerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const opponentTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((msg: string, type = "") => {
    setLog((prev) => [{ msg, type }, ...prev].slice(0, 60));
  }, []);

  const triggerAnim = useCallback(
    (
      who: "player" | "opponent",
      state: FighterAnimState,
      duration = ANIM_DURATION
    ) => {
      const timerRef = who === "player" ? playerTimerRef : opponentTimerRef;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (who === "player") {
        setPlayerAnim(state);
        setPlayerAnimKey((k) => k + 1);
      } else {
        setOpponentAnim(state);
        setOpponentAnimKey((k) => k + 1);
      }

      if (state !== "ko" && state !== "idle") {
        timerRef.current = setTimeout(() => {
          if (who === "player") setPlayerAnim("idle");
          else setOpponentAnim("idle");
          timerRef.current = null;
        }, duration);
      }
    },
    []
  );

  const triggerShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 400);
  }, []);

  const triggerImpact = useCallback((side: "left" | "right") => {
    setShowImpact(side);
    setTimeout(() => setShowImpact(null), 400);
  }, []);

  const handleLiveEvent = useCallback(
    (evt: GameEvent) => {
      if (evt.match_id !== matchIdRef.current) return;
      const p = evt.payload || {};
      const pid = playerIdRef.current;

      if (evt.type === "hit" || evt.type === "critical_hit") {
        const atk = p.attacker as string;
        const tgt = p.target as string;
        const hp = p.target_hp as number;
        const isCrit = evt.type === "critical_hit";

        if (atk === pid) {
          triggerAnim("player", isCrit ? "crit" : "attack");
          triggerAnim("opponent", "hit_recv");
          setOpponentHP(hp);
          triggerImpact("right");
        } else {
          triggerAnim("opponent", isCrit ? "crit" : "attack");
          triggerAnim("player", "hit_recv");
          setPlayerHP(hp);
          triggerImpact("left");
        }

        if (isCrit) triggerShake();

        const prefix = isCrit ? "CRIT " : "";
        addLog(`${prefix}${atk} → ${tgt} dmg:${p.damage} hp:${hp}`, evt.type);
      } else if (evt.type === "dodge") {
        const who = p.player_id as string;
        if (who === pid) {
          triggerAnim("player", "dodge");
        } else {
          triggerAnim("opponent", "dodge");
        }
        addLog(`${who} dodged!`, "dodge");
      } else if (evt.type === "powerup_spawn") {
        const who = p.player_id as string;
        if (who === pid) {
          triggerAnim("player", "powerup");
        } else {
          triggerAnim("opponent", "powerup");
        }
        addLog(`${who} POWERUP!`, "powerup_spawn");
      } else if (evt.type === "match_end") {
        const w = p.winner as string;
        const loser = p.loser as string;
        if (loser === pid) {
          triggerAnim("player", "ko", 0);
          triggerAnim("opponent", "idle");
        } else {
          triggerAnim("opponent", "ko", 0);
          triggerAnim("player", "idle");
        }
        triggerShake();
        setWinner(w);
        setPhase("ended");
        addLog(`K.O.! ${w} wins!`, "match_end");
      }
    },
    [addLog, triggerAnim, triggerShake, triggerImpact]
  );

  useEffect(() => {
    const disconnect = connectLiveWS(handleLiveEvent, () => {});
    return disconnect;
  }, [handleLiveEvent]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (phase !== "fighting" || !wsConnected) return;
      const action = ACTION_KEYS[e.key];
      if (action) sendAction(action);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleCharacterSelect = async (char: Character) => {
    setPlayerChar(char);
    const opp = getRandomCharacter(char.id);
    setOpponentChar(opp);
    setArenaImage(getRandomArena().image);

    const pid = `player_${char.id}_${Date.now().toString(36)}`;
    setPlayerId(pid);
    playerIdRef.current = pid;

    addLog(`You chose ${char.name}`, "info");
    addLog(`Opponent: ${opp.name} — ${opp.title}`, "info");

    try {
      const res = await createMatch("player", pid);
      if (res.error) {
        addLog(`error: ${res.error}`, "error");
        return;
      }

      setMatchId(res.match_id);
      matchIdRef.current = res.match_id;
      setOpponentId(res.player_b);
      setPlayerHP(100);
      setOpponentHP(100);
      setPlayerAnim("idle");
      setOpponentAnim("idle");
      setPhase("fighting");
      addLog("FIGHT!", "match_end");

      playerWS.current?.close();
      playerWS.current = connectPlayerWS(
        (data) => {
          if (data.error) addLog(`ws: ${data.error}`, "error");
        },
        setWsConnected
      );
    } catch (e) {
      addLog(`connection error: ${e}`, "error");
    }
  };

  const ACTION_COOLDOWN_MS = 500;

  const sendAction = useCallback(
    (action: string) => {
      if (!playerWS.current || !matchId || actionCooldown) return;
      setActionCooldown(true);
      setTimeout(() => setActionCooldown(false), ACTION_COOLDOWN_MS);
      playerWS.current.send({
        match_id: matchId,
        player_id: playerId,
        action,
      });
    },
    [matchId, playerId, actionCooldown]
  );

  const handleRematch = () => {
    playerWS.current?.close();
    playerWS.current = null;
    setPhase("select");
    setPlayerChar(null);
    setOpponentChar(null);
    setMatchId("");
    setPlayerId("");
    setOpponentId("");
    setPlayerHP(100);
    setOpponentHP(100);
    setPlayerAnim("idle");
    setOpponentAnim("idle");
    setWinner(undefined);
    setScreenShake(false);
    setShowImpact(null);
    setLog([]);
  };

  const typeColors: Record<string, string> = {
    hit: "text-[var(--orange)]",
    critical_hit: "text-[var(--red)]",
    dodge: "text-[var(--cyan)]",
    powerup_spawn: "text-[var(--yellow)]",
    match_end: "text-[var(--green)] font-bold",
    info: "text-[var(--yellow)]",
    error: "text-[var(--red)]",
  };

  if (phase === "select") {
    return (
      <div className="py-6">
        <CharacterSelect onSelect={handleCharacterSelect} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-w-5xl mx-auto">
      {playerChar && opponentChar && (
        <FightArena
          player={{
            character: playerChar,
            hp: playerHP,
            animState: playerAnim,
            animKey: playerAnimKey,
          }}
          opponent={{
            character: opponentChar,
            hp: opponentHP,
            animState: opponentAnim,
            animKey: opponentAnimKey,
          }}
          matchId={matchId}
          onAction={sendAction}
          actionsDisabled={!wsConnected || actionCooldown}
          matchEnded={phase === "ended"}
          winner={
            winner === playerId
              ? playerChar.name
              : winner === opponentId
              ? opponentChar.name
              : winner
          }
          screenShake={screenShake}
          showImpact={showImpact}
          arenaImage={arenaImage}
        />
      )}

      <div className="flex gap-3">
        <div className="flex-1 border border-[var(--border)] bg-[var(--panel)] rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-[10px] text-[var(--dim)] uppercase tracking-wider">
              Combat Log
            </div>
            <span className="ml-auto text-[9px]">
              {wsConnected ? (
                <span className="text-[var(--green)]">● CONNECTED</span>
              ) : (
                <span className="text-[var(--red)]">● OFFLINE</span>
              )}
            </span>
          </div>
          <div className="bg-black border border-[#1a1a1a] rounded p-2 h-28 overflow-y-auto text-[11px] font-mono">
            {log.map((entry, i) => (
              <div key={i} className={typeColors[entry.type] || ""}>
                {entry.msg}
              </div>
            ))}
          </div>
        </div>

        {phase === "ended" && (
          <button
            onClick={handleRematch}
            className="self-center px-8 py-3 text-sm font-bold uppercase tracking-[0.3em] rounded-lg transition-colors"
            style={{
              backgroundColor: "#00ffff",
              color: "#000",
              boxShadow: "0 0 20px #00ffff66",
            }}
          >
            Rematch
          </button>
        )}
      </div>
    </div>
  );
}
