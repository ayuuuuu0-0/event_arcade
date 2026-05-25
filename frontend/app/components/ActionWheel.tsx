"use client";

interface ActionWheelProps {
  onAction: (action: string) => void;
  disabled: boolean;
  side: "left" | "right";
}

const ACTIONS = [
  { key: "hit", label: "HIT", shortcut: "A", color: "#ff8800", icon: "👊" },
  { key: "dodge", label: "DODGE", shortcut: "W", color: "#00ffff", icon: "💨" },
  { key: "critical_hit", label: "CRIT", shortcut: "S", color: "#ff4444", icon: "🔥" },
  { key: "powerup_spawn", label: "PWR", shortcut: "E", color: "#ffff00", icon: "⚡" },
  { key: "idle", label: "WAIT", shortcut: "SPC", color: "#666666", icon: "🛡️" },
];

export default function ActionWheel({ onAction, disabled, side }: ActionWheelProps) {
  const positions = [
    { x: 0, y: -52 },
    { x: 49, y: -16 },
    { x: 30, y: 42 },
    { x: -30, y: 42 },
    { x: -49, y: -16 },
  ];

  return (
    <div
      className={`relative w-36 h-36 ${
        side === "left" ? "self-start" : "self-end"
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
          <span className="text-[8px] text-[var(--dim)] uppercase">Act</span>
        </div>
      </div>

      {ACTIONS.map((action, i) => {
        const pos = positions[i];
        return (
          <button
            key={action.key}
            onClick={() => onAction(action.key)}
            disabled={disabled}
            className="absolute w-12 h-12 rounded-full flex flex-col items-center justify-center
                       transition-all duration-150 hover:scale-110 active:scale-95
                       disabled:opacity-20 disabled:cursor-not-allowed group"
            style={{
              left: `calc(50% + ${pos.x}px - 24px)`,
              top: `calc(50% + ${pos.y}px - 24px)`,
              backgroundColor: `${action.color}22`,
              border: `2px solid ${action.color}`,
              boxShadow: disabled ? "none" : `0 0 10px ${action.color}33`,
            }}
            title={`${action.label} [${action.shortcut}]`}
          >
            <span className="text-lg leading-none">{action.icon}</span>
            <span
              className="text-[7px] font-bold uppercase leading-none mt-0.5"
              style={{ color: action.color }}
            >
              {action.shortcut}
            </span>
          </button>
        );
      })}
    </div>
  );
}
