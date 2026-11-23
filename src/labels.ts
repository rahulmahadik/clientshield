export const SENSITIVITY_META: Record<
  string,
  { label: string; rank: number; dot: string }
> = {
  public: { label: "Public", rank: 0, dot: "var(--green)" },
  internal: { label: "Internal", rank: 1, dot: "var(--blue)" },
  "client-confidential": {
    label: "Client-confidential",
    rank: 2,
    dot: "var(--orange)",
  },
  regulated: { label: "Regulated", rank: 3, dot: "var(--red)" },
};

export const SENSITIVITY_ORDER = [
  "public",
  "internal",
  "client-confidential",
  "regulated",
];

export const DECISION_META: Record<
  string,
  { label: string; hint: string }
> = {
  ALLOW: { label: "ALLOW", hint: "Agent may act without asking" },
  APPROVE: { label: "APPROVE", hint: "Held until the owner says yes" },
  NEVER: { label: "NEVER", hint: "Blocked and reported, always" },
  HOLD: { label: "HOLD", hint: "Held for the owner's approval" },
  BLOCK: { label: "BLOCK", hint: "Blocked; the action never runs" },
};

export const GATEWAY_DECISIONS = ["ALLOW", "HOLD", "BLOCK"] as const;

export function sensitivityMeta(id: string) {
  return SENSITIVITY_META[id] ?? { label: id, rank: 99, dot: "var(--muted)" };
}
