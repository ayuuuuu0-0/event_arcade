"use client";

interface MetricCardProps {
  label: string;
  value: string | number;
}

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="border border-[var(--border)] bg-[var(--panel)] rounded px-4 py-3 text-center flex-1">
      <div className="text-2xl font-bold text-[var(--cyan)]">{value}</div>
      <div className="text-[10px] text-[var(--dim)] uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}
