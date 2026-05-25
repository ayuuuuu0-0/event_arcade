"use client";

interface HPBarProps {
  name: string;
  hp: number;
}

export default function HPBar({ name, hp }: HPBarProps) {
  const pct = Math.max(0, Math.min(100, hp));
  let color = "bg-green-500";
  if (pct < 30) color = "bg-red-500";
  else if (pct < 60) color = "bg-orange-500";

  const shortName = name.length > 14 ? name.slice(0, 14) + "…" : name;

  return (
    <div className="flex-1 text-center">
      <div className="text-[11px] text-[var(--green)] mb-1 truncate">
        {shortName}
      </div>
      <div className="h-2.5 bg-[#1a1a1a] rounded overflow-hidden">
        <div
          className={`h-full rounded transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[9px] text-[var(--dim)] mt-0.5">{hp} HP</div>
    </div>
  );
}
