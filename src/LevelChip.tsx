import type { ReactNode } from "react";
import { sensitivityMeta } from "./labels";

function LockIcon({ color }: { color: string }) {
  return (
    <svg
      width="9"
      height="11"
      viewBox="0 0 9 11"
      fill="none"
      aria-hidden
      style={{ flex: "none" }}
    >
      <path
        d="M2.25 4.5V3.25a2.25 2.25 0 0 1 4.5 0V4.5"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <rect x="1" y="4.5" width="7" height="5.5" rx="1" stroke={color} strokeWidth="1.1" />
    </svg>
  );
}

/**
 * Data-level chip: outlined with a lock icon — always visually distinct from
 * solid decision badges (ALLOW / HOLD / BLOCK).
 */
export function LevelChip({ id, children }: { id: string; children?: ReactNode }) {
  const meta = sensitivityMeta(id);
  const tone = meta.dot;
  return (
    <span
      className="level-chip level-outlined"
      style={{ ["--chip" as string]: tone, ["--chip-ink" as string]: tone }}
    >
      <LockIcon color={tone} />
      {children ?? meta.label}
    </span>
  );
}
