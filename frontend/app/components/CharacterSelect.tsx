"use client";

import { useState } from "react";
import type { Character } from "../lib/characters";
import { CHARACTERS } from "../lib/characters";
import { useTransparentSprite } from "../lib/useTransparentSprite";

interface CharacterSelectProps {
  onSelect: (character: Character) => void;
}

function CharacterThumb({ character }: { character: Character }) {
  const src = useTransparentSprite(character.sprites.idle[0]);
  return (
    <div
      className="relative w-full h-20 mb-1"
      style={{ filter: `drop-shadow(0 0 3px ${character.color}44)` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={character.name}
        className="absolute inset-0 w-full h-full object-contain"
      />
    </div>
  );
}

function ShowcaseSprite({ character }: { character: Character }) {
  const src = useTransparentSprite(character.sprites.idle[0]);
  return (
    <div
      className="relative w-52 h-64 mb-3 fighter-idle"
      style={{
        filter: `drop-shadow(0 0 5px ${character.color}66) drop-shadow(0 0 12px ${character.color}33)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={character.name}
        className="absolute inset-0 w-full h-full object-contain"
      />
    </div>
  );
}

export default function CharacterSelect({ onSelect }: CharacterSelectProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const hovered = CHARACTERS.find((c) => c.id === hoveredId);
  const selected = CHARACTERS.find((c) => c.id === selectedId);
  const showcase = selected || hovered;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-6xl mx-auto">
      <div className="text-center">
        <h2
          className="text-3xl font-bold tracking-[0.3em] uppercase"
          style={{ color: "#00ffff", textShadow: "0 0 20px #00ffff88" }}
        >
          Choose Your Fighter
        </h2>
        <div className="text-[var(--dim)] text-xs mt-1 tracking-wider">
          SELECT A CHARACTER TO ENTER THE ARENA
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 w-full">
        {CHARACTERS.map((char) => {
          const isSelected = selectedId === char.id;
          const isHovered = hoveredId === char.id;
          return (
            <button
              key={char.id}
              onMouseEnter={() => setHoveredId(char.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setSelectedId(char.id)}
              className="relative border-2 rounded-lg p-2 text-center transition-all duration-200"
              style={{
                borderColor: isSelected
                  ? char.color
                  : isHovered
                  ? char.accent
                  : "#222",
                backgroundColor: isSelected ? `${char.color}15` : "#111",
                boxShadow: isSelected
                  ? `0 0 25px ${char.color}44, inset 0 0 15px ${char.color}22`
                  : isHovered
                  ? `0 0 10px ${char.color}22`
                  : "none",
              }}
            >
              {isSelected && (
                <div
                  className="absolute top-1 right-2 text-[7px] font-bold uppercase tracking-wider"
                  style={{ color: char.color }}
                >
                  SELECTED
                </div>
              )}
              <CharacterThumb character={char} />
              <div
                className="font-bold text-[10px] truncate"
                style={{ color: char.color }}
              >
                {char.name}
              </div>
              <div
                className="text-[7px] tracking-wider uppercase truncate"
                style={{ color: char.accent }}
              >
                {char.title}
              </div>
            </button>
          );
        })}
      </div>

      {showcase && (
        <div
          className="flex items-center gap-6 transition-all duration-300"
          key={showcase.id}
        >
          <ShowcaseSprite character={showcase} />
          <div className="flex flex-col">
            <div
              className="text-2xl font-bold uppercase tracking-wider"
              style={{
                color: showcase.color,
                textShadow: `0 0 15px ${showcase.color}66`,
              }}
            >
              {showcase.name}
            </div>
            <div
              className="text-xs tracking-wider mb-1"
              style={{ color: showcase.accent }}
            >
              {showcase.title}
            </div>
            <div className="text-[var(--dim)] text-xs max-w-xs">
              {showcase.description}
            </div>
          </div>
        </div>
      )}

      {!showcase && (
        <div className="text-[var(--dim)] text-sm py-8">
          Hover or click a fighter
        </div>
      )}

      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected}
        className="px-10 py-3 text-sm font-bold uppercase tracking-[0.3em] rounded-lg transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed"
        style={{
          backgroundColor: selected ? selected.color : "#333",
          color: selected ? "#000" : "#666",
          boxShadow: selected
            ? `0 0 30px ${selected.color}66, 0 0 60px ${selected.color}33`
            : "none",
        }}
      >
        Enter Arena
      </button>
    </div>
  );
}
