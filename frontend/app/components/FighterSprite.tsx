"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Character } from "../lib/characters";
import type { FighterAnimState, AnimFrame } from "../lib/animations";
import { ANIM_SEQUENCES } from "../lib/animations";
import { useTransparentSprite } from "../lib/useTransparentSprite";

export type { FighterAnimState };

interface FighterSpriteProps {
  character: Character;
  side: "left" | "right";
  animState: FighterAnimState;
  animKey: number;
  onAnimEnd?: () => void;
}

export default function FighterSprite({
  character,
  side,
  animState,
  animKey,
  onAnimEnd,
}: FighterSpriteProps) {
  const [currentFrame, setCurrentFrame] = useState<AnimFrame | null>(null);
  const [rawSpriteSrc, setRawSpriteSrc] = useState(character.sprites.idle[0]);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const seqRef = useRef(ANIM_SEQUENCES.idle);
  const flip = side === "right";
  const dirMul = side === "left" ? 1 : -1;

  const transparentSrc = useTransparentSprite(rawSpriteSrc);

  const runSequence = useCallback(() => {
    const seq = seqRef.current;
    const frames = seq.frames;
    const totalMs = frames.reduce((sum, f) => sum + f.ms, 0);

    function tick(timestamp: number) {
      if (startTimeRef.current === 0) startTimeRef.current = timestamp;
      let elapsed = timestamp - startTimeRef.current;

      if (seq.loop) {
        elapsed = elapsed % totalMs;
      } else if (elapsed >= totalMs) {
        const lastFrame = frames[frames.length - 1];
        setCurrentFrame(lastFrame);
        const sprites = character.sprites[seq.spriteKey];
        const idx = Math.min(lastFrame.frameIdx, sprites.length - 1);
        setRawSpriteSrc(sprites[idx]);
        if (!seq.loop) onAnimEnd?.();
        return;
      }

      let acc = 0;
      for (const frame of frames) {
        acc += frame.ms;
        if (elapsed < acc) {
          setCurrentFrame(frame);
          const sprites = character.sprites[seq.spriteKey];
          const idx = Math.min(frame.frameIdx, sprites.length - 1);
          setRawSpriteSrc(sprites[idx]);
          break;
        }
      }

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
  }, [character.sprites, onAnimEnd]);

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    startTimeRef.current = 0;
    seqRef.current = ANIM_SEQUENCES[animState];
    setRawSpriteSrc(character.sprites[seqRef.current.spriteKey][0]);
    runSequence();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animState, animKey, character.sprites, runSequence]);

  const frame = currentFrame || ANIM_SEQUENCES.idle.frames[0];

  const transform = [
    `translateX(${frame.x * dirMul}px)`,
    `translateY(${frame.y}px)`,
    `scaleX(${flip ? -frame.scaleX : frame.scaleX})`,
    `scaleY(${frame.scaleY})`,
  ].join(" ");

  const glowColor = character.color;

  return (
    <div className="relative flex flex-col items-center">
      <div
        style={{
          transform,
          opacity: frame.opacity,
          transition: "none",
          willChange: "transform, opacity, filter",
        }}
      >
        <div
          className="relative w-48 h-60 md:w-56 md:h-72"
          style={{
            filter: [
              `drop-shadow(0 0 4px ${glowColor}66)`,
              `drop-shadow(0 0 10px ${glowColor}33)`,
              frame.brightness !== 1 ? `brightness(${frame.brightness})` : "",
            ]
              .filter(Boolean)
              .join(" "),
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={transparentSrc}
            alt={character.name}
            className="absolute inset-0 w-full h-full object-contain"
          />
        </div>

        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full blur-md"
          style={{
            width: 60,
            height: 8,
            backgroundColor: glowColor,
            opacity: 0.2,
          }}
        />
      </div>
    </div>
  );
}
