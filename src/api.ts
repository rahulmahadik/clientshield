export interface FigureSource {
  raw: string;
  path: string;
  line: string;
}

export type FigureStatus = "supported" | "contradicted" | "no_source";

export interface FigureRow {
  raw: string;
  kind: string;
  status: FigureStatus;
  source: FigureSource | null;
}

export interface FileReadRef {
  path: string;
  sensitivity: string;
}

export function exportAuditLog(format: "csv" | "json"): Promise<Blob> {
  return fetch(`/api/actions/export?format=${format}`).then(async (response) => {
    if (!response.ok) {
      throw new Error("Failed to export the audit log");
    }
    return response.blob();
  });
}

export interface FileSummary {
  path: string;
  title: string;
  sensitivity: string;
}

export interface FileDetail extends FileSummary {
  content: string;
}

export interface Rule {
  id: string;
  position: number;
  action: string;
  condition: string;
  decision: string;
  note: string | null;
  plain: string;
}

export interface Level {
  id: string;
  rank: number;
  name: string;
  definition: string;
  may_leave_company: string;
  may_go_to_external_ai: string;
  approval_needed_to_share: string;
}

export type GatewayDecision = "ALLOW" | "HOLD" | "BLOCK";

export interface ActionEntry {
  id: number;
  created_at: string;
  agent: string;
  action: string;
  params: Record<string, unknown>;
  decision: GatewayDecision;
  rule_ids: string[];
  reason: string;
  evidence: string;
  data_level: string;
  fix: string | null;
  figures: FigureRow[] | null;
  files_read: FileReadRef[] | null;
  run_id: number | null;
  trust_before: number | null;
  trust_after: number | null;
  run_rogue: boolean | null;
  via: string | null;
}

export interface ActResponse {
  action_id: number | null;
  logged_at: string | null;
  agent: string;
  action: string;
  decision: GatewayDecision;
  rule_ids: string[];
  reason: string;
  evidence: string;
  data_level: string;
  fix: string | null;
  result: unknown;
}

export type AgentStatus = "active" | "paused";

export interface AgentRow {
  id: string;
  name: string;
  role: string;
  description: string;
  status: AgentStatus;
  trust_score: number;
}

export interface RunStep {
  n: number;
  action: string;
  params: Record<string, unknown>;
  decision: GatewayDecision;
  rule_ids: string[];
  reason: string;
  evidence: string;
  data_level: string;
  fix: string | null;
  figures: FigureRow[] | null;
  files_read: FileReadRef[] | null;
  injection: { line: string } | null;
}

export type RunStatus = "running" | "done" | "error";

export interface RunRow {
  id: number;
  agent_id: string;
  agent_name: string;
  task: string;
  rogue: boolean;
  status: RunStatus;
  error: string | null;
  started_at: string;
  finished_at: string | null;
  steps: RunStep[];
  planner: string | null;
}

async function postJson<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (parsed?.error === "owner_login_required") notifyLoginRequired();
    const details = Array.isArray(parsed?.details) ? ` (${parsed.details.join("; ")})` : "";
    throw new Error(`${parsed?.error ?? "request failed"}${details}`);
  }
  return parsed as T;
}

function notifyLoginRequired() {
  window.dispatchEvent(new CustomEvent("cs-login-required"));
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function fetchFiles(): Promise<FileSummary[]> {
  return getJson<{ files: FileSummary[] }>("/api/files").then(
    (body) => body.files,
  );
}

export function fetchFileContent(path: string): Promise<FileDetail> {
  const encoded = encodeURIComponent(path);
  return getJson<{ file: FileDetail }>(
    `/api/files/content?path=${encoded}`,
  ).then((body) => body.file);
}

export function fetchRules(): Promise<Rule[]> {
  return getJson<{ rules: Rule[] }>("/api/rules").then((body) => body.rules);
}

export function fetchLevels(): Promise<Level[]> {
  return getJson<{ levels: Level[] }>("/api/levels").then(
    (body) => body.levels,
  );
}

export function fetchActions(limit = 200, includeSuite = false): Promise<ActionEntry[]> {
  return getJson<{ actions: ActionEntry[] }>(
    `/api/actions?limit=${limit}${includeSuite ? "&suite=1" : ""}`,
  ).then((body) => body.actions);
}

export function postAct(
  agent: string,
  action: string,
  params: Record<string, unknown>,
): Promise<ActResponse> {
  // Owner console: the in-app form acts directly; external agents use
  // /api/act with a Bearer token instead.
  return fetch("/api/owner/act", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ agent, action, params }),
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = Array.isArray(body?.details) ? ` (${body.details.join("; ")})` : "";
      throw new Error(`${body?.error ?? "request failed"}${details}`);
    }
    return body as ActResponse;
  });
}

export function fetchAgents(): Promise<AgentRow[]> {
  return getJson<{ agents: AgentRow[] }>("/api/agents").then(
    (body) => body.agents,
  );
}

export function setAgentStatus(
  id: string,
  status: AgentStatus,
): Promise<AgentRow> {
  return postJson<{ agent: AgentRow }>(
    `/api/agents/${id}`,
    { status },
    "PATCH",
  ).then((body) => body.agent);
}

export function startRun(
  agentId: string,
  task: string,
  rogue: boolean,
): Promise<RunRow> {
  return postJson<{ run: RunRow }>("/api/agent-runs", {
    agent_id: agentId,
    task,
    rogue,
  }).then((body) => body.run);
}

export function fetchRun(id: number): Promise<RunRow> {
  return getJson<{ run: RunRow }>(`/api/agent-runs/${id}`).then(
    (body) => body.run,
  );
}

export function clearActionLog(): Promise<void> {
  return fetch("/api/actions", { method: "DELETE" }).then(async (response) => {
    if (!response.ok) {
      throw new Error("Failed to clear the action log");
    }
  });
}

export interface IntegrityReport {
  ok: boolean;
  checked: number;
  broken_row_id: number | null;
  reason: string | null;
}

export function verifyIntegrity(): Promise<IntegrityReport> {
  return getJson<IntegrityReport>("/api/actions/integrity");
}

export interface PendingApproval {
  id: number;
  created_at: string;
  agent: string;
  action: string;
  params: Record<string, unknown>;
  decision: string;
  rule_ids: string[];
  reason: string;
  evidence: string;
  data_level: string;
  fix: string | null;
  figures: FigureRow[] | null;
  files_read: FileReadRef[] | null;
}

export function fetchPendingApprovals(): Promise<PendingApproval[]> {
  return getJson<{ pending: PendingApproval[] }>("/api/approvals").then(
    (body) => body.pending,
  );
}

export function resolveApproval(
  actionId: number,
  decision: "approve" | "reject",
  note: string,
): Promise<{ executed: unknown; log_entry: { id: number; decision: string; reason: string } }> {
  return postJson(`/api/approvals/${actionId}/${decision}`, { note });
}

export function setAllAgentsStatus(status: AgentStatus): Promise<void> {
  return postJson("/api/agents", { status }, "PATCH").then(() => undefined);
}

export interface ScenarioDefinition {
  id: string;
  position: number;
  name: string;
  trigger: string;
  expected_decision: GatewayDecision;
  expected_rules: string[];
  expected_data_level: string | null;
  keywords: string[];
  custom: boolean;
}

export function fetchScenarios(): Promise<ScenarioDefinition[]> {
  return getJson<{ scenarios: ScenarioDefinition[] }>("/api/scenarios").then(
    (body) => body.scenarios,
  );
}

export interface ScenarioStepResult {
  action: string;
  decision: GatewayDecision;
  rule_ids: string[];
  reason: string;
  evidence: string;
  data_level: string;
  injection: { line: string } | null;
}

export interface ScenarioResult {
  id: string;
  name: string;
  trigger: string;
  custom: boolean;
  expected_decision: GatewayDecision;
  expected_rules: string[];
  expected_data_level: string | null;
  actual_decision: GatewayDecision;
  actual_rules: string[];
  actual_data_level: string;
  steps: ScenarioStepResult[];
  checks: { decision: boolean; rules: boolean; evidence: boolean };
  score: number;
}

export interface ScenarioSuiteReport {
  results: ScenarioResult[];
  score: number;
  total: number;
  core_score: number;
  core_total: number;
  extra_score: number;
  extra_total: number;
  missed_violations: number;
  false_positives: number;
  created_at?: string;
}

export function runScenarioSuite(): Promise<ScenarioSuiteReport> {
  return postJson<ScenarioSuiteReport>("/api/scenarios/run", {});
}

export function fetchLastSuiteRun(): Promise<ScenarioSuiteReport | null> {
  return getJson<{ run: ScenarioSuiteReport | null }>(
    "/api/scenarios/last",
  ).then((body) => body.run);
}

export interface ClassifierReport {
  total: number;
  correct: number;
  accuracy: number;
  mismatches: { file: string; expected: string; actual: string }[];
}

export function fetchClassifierReport(): Promise<ClassifierReport> {
  return getJson<ClassifierReport>("/api/classifier");
}

export interface Briefing {
  id: number;
  briefing_date: string;
  headline: string;
  body: string;
  counts: Record<string, number>;
  created_at: string;
}

export function generateBriefing(): Promise<Briefing> {
  return postJson<{ briefing: Briefing }>("/api/briefing/generate", {}).then(
    (body) => body.briefing,
  );
}

export function fetchBriefings(limit = 30): Promise<Briefing[]> {
  return getJson<{ briefings: Briefing[] }>(`/api/briefings?limit=${limit}`).then(
    (body) => body.briefings,
  );
}

export interface TodayReport {
  counters: {
    actions: number;
    allowed: number;
    held: number;
    blocked: number;
    figures_caught: number;
    injections: number;
  };
  integrity: IntegrityReport;
  agents: AgentRow[];
  approvals: {
    count: number;
    items: {
      id: number;
      agent: string;
      action: string;
      reason: string;
      rule_ids: string[];
      amount: number | null;
      data_level: string;
    }[];
  };
  stopped: {
    id: number;
    agent: string;
    action: string;
    reason: string;
    rule_ids: string[];
    amount: number | null;
  }[];
  feed: {
    id: number;
    created_at: string;
    agent: string;
    action: string;
    decision: GatewayDecision;
    reason: string;
  }[];
  suite: {
    score: number;
    total: number;
    core_score: number;
    core_total: number;
    missed_violations: number;
    false_positives: number;
  } | null;
  briefing: Briefing | null;
  classifier: { correct: number; total: number } | null;
  planner: { key_set: boolean; status: string | null };
}

export interface IssuedToken {
  agent: { id: string; name: string };
  token: string;
  note: string;
}

export function issueAgentToken(agentId: string): Promise<IssuedToken> {
  return postJson<IssuedToken>(`/api/agents/${agentId}/token`, {});
}

export function fetchToday(): Promise<TodayReport> {
  return getJson<TodayReport>("/api/today");
}

export interface DemoResetResult {
  replayed: number;
  suite: ScenarioSuiteReport | null;
  briefing: Briefing | null;
  today: TodayReport;
}

export function resetDemoDay(): Promise<DemoResetResult> {
  return postJson<DemoResetResult>("/api/demo/reset", {});
}

export function login(username: string, password: string): Promise<{ authenticated: boolean }> {
  return postJson<{ authenticated: boolean }>("/api/auth/login", { username, password });
}

export function logout(): Promise<void> {
  return postJson<{ authenticated: boolean }>("/api/auth/logout", {}).then(() => undefined);
}

export function fetchAuthState(): Promise<boolean> {
  return getJson<{ authenticated: boolean }>("/api/auth/me").then(
    (body) => body.authenticated,
  );
}

export interface Settings {
  floors: { client: string; floor: number }[];
  llm_daily_cap: number;
  briefing_time: string;
}

export function fetchSettings(): Promise<Settings> {
  return getJson<Settings>("/api/settings");
}

export function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return postJson<Settings>("/api/settings", patch, "PUT");
}

export interface RedTeamCaseResult {
  id: string;
  kind: string;
  name: string;
  note: string;
  decision: string | null;
  caught: boolean;
  detail: string;
}

export interface RedTeamReport {
  results: RedTeamCaseResult[];
  caught: number;
  attacks_total: number;
  clean_passed: number;
  clean_total: number;
  false_alarms: number;
  created_at?: string;
}

export function runRedTeam(): Promise<RedTeamReport> {
  return postJson<RedTeamReport>("/api/redteam/run", {});
}

export function fetchLastRedTeamRun(): Promise<RedTeamReport | null> {
  return getJson<{ run: RedTeamReport | null }>("/api/redteam/last").then(
    (body) => body.run,
  );
}
