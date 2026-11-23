// One-off local seeding script (run in the sandbox with the page's local
// verification connection info injected as SUPABASE_* environment variables):
//   node scripts/seed.mjs
// Reads seed/seed-data.json and upserts rows through the anon key. The app
// itself never runs DDL or seeding.
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const instanceId = process.env.SUPABASE_INSTANCE_ID;
if (!url || !key || !instanceId) {
  console.error("Missing SUPABASE_* environment variables for local seeding.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  global: { headers: { "X-Instance-ID": instanceId } },
  auth: { persistSession: false, autoRefreshToken: false },
});

const { files, rules, levels, floors, agents, scenarios, ground_truth } = JSON.parse(
  await readFile(new URL("../seed/seed-data.json", import.meta.url), "utf8"),
);

async function upsertAll(table, rows, onConflict) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) {
    console.error(`Seed failed for ${table}: code=${error.code ?? "UNKNOWN"} hint=check-migrate`);
    process.exit(1);
  }
  console.log(`Seeded ${table}: ${rows.length} rows`);
}

await upsertAll("files", files, "path");
await upsertAll("rules", rules, "id");
await upsertAll(
  "levels",
  levels.map((l) => ({
    id: l.id,
    rank: l.rank,
    name: l.name,
    definition: l.definition,
    may_leave_company: l.may_leave_company,
    may_go_to_external_ai: l.may_go_to_external_ai,
    approval_needed_to_share: l.approval_needed_to_share,
  })),
  "id",
);
await upsertAll(
  "floors",
  (floors ?? []).map((f) => ({ client: f.client, floor: f.floor })),
  "client",
);
await upsertAll(
  "agents",
  (agents ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    description: a.description,
    status: "active",
    trust_score: 100,
  })),
  "id",
);
await upsertAll(
  "scenarios",
  (scenarios ?? []).map((s) => ({
    id: s.id,
    position: s.position,
    name: s.name,
    trigger: s.trigger,
    expected_decision: s.expected_decision,
    expected_rules: s.expected_rules,
    expected_data_level: s.expected_data_level,
    keywords: s.keywords,
    custom: s.custom,
  })),
  "id",
);
await upsertAll(
  "ground_truth",
  (ground_truth ?? []).map((g) => ({ file: g.file, sensitivity: g.sensitivity })),
  "file",
);
console.log("Seed complete.");
