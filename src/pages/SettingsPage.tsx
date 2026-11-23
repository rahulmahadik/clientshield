import { useEffect, useState } from "react";
import { fetchSettings, updateSettings } from "../api";
import type { Settings } from "../api";

type Theme = "dark" | "light";

function loadTheme(): Theme {
  const stored = window.localStorage.getItem("cs-theme");
  return stored === "light" ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("cs-theme", theme);
}

export function SettingsPage({
  authed,
  onSignIn,
}: {
  authed: boolean;
  onSignIn: () => void;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [floors, setFloors] = useState<{ client: string; floor: string }[]>([]);
  const [cap, setCap] = useState("50");
  const [briefingTime, setBriefingTime] = useState("08:00");
  const [theme, setTheme] = useState<Theme>("dark");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const initial = loadTheme();
    setTheme(initial);
    applyTheme(initial);
    fetchSettings()
      .then((data) => {
        setSettings(data);
        setFloors(data.floors.map((row) => ({ client: row.client, floor: String(row.floor) })));
        setCap(String(data.llm_daily_cap));
        setBriefingTime(data.briefing_time);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load settings"),
      );
  }, []);

  function switchTheme(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  function setFloorAt(index: number, patch: Partial<{ client: string; floor: string }>) {
    setFloors((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function save(section: "floors" | "runtime") {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      let patch: Partial<Settings>;
      if (section === "floors") {
        patch = {
          floors: floors
            .filter((row) => row.client.trim() !== "")
            .map((row) => ({ client: row.client.trim(), floor: Number(row.floor) })),
        };
      } else {
        patch = { llm_daily_cap: Number(cap), briefing_time: briefingTime };
      }
      const next = await updateSettings(patch);
      setSettings(next);
      setFloors(next.floors.map((row) => ({ client: row.client, floor: String(row.floor) })));
      setSaved(section === "floors" ? "Floors saved — the gateway uses them immediately." : "Settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Settings</h2>
          <p className="page-sub">
            Owner preferences for the studio. Viewing is open to everyone;
            changes need the owner.
          </p>
        </div>
        {!authed && (
          <button type="button" className="signin-button" onClick={onSignIn}>
            sign in to change
          </button>
        )}
      </div>
      {error && <div className="state-banner state-error">{error}</div>}
      {saved && <div className="state-banner state-integrity-ok">{saved}</div>}
      {settings === null && !error && (
        <div className="state-banner">Loading settings…</div>
      )}

      <div className="settings-card">
        <h3 className="try-title">Theme</h3>
        <p className="try-sub">Applies instantly on this device.</p>
        <div className="theme-row">
          <button
            type="button"
            className={`theme-option ${theme === "dark" ? "theme-active" : ""}`}
            onClick={() => switchTheme("dark")}
          >
            Dark navy
          </button>
          <button
            type="button"
            className={`theme-option ${theme === "light" ? "theme-active" : ""}`}
            onClick={() => switchTheme("light")}
          >
            Light
          </button>
        </div>
      </div>

      <div className="settings-card">
        <h3 className="try-title">Price floors per client</h3>
        <p className="try-sub">
          The gateway blocks any quote below a client's floor (R08) and uses
          these values in the evidence lines. Saved to the database and applied
          immediately.
        </p>
        <div className="floors-table">
          {floors.map((row, index) => (
            <div className="floor-row" key={index}>
              <input
                value={row.client}
                onChange={(event) => setFloorAt(index, { client: event.target.value })}
                placeholder="Client name"
                disabled={!authed}
              />
              <input
                type="number"
                min={0}
                value={row.floor}
                onChange={(event) => setFloorAt(index, { floor: event.target.value })}
                placeholder="SGD"
                disabled={!authed}
              />
              <span className="floor-sgd">SGD</span>
              <button
                type="button"
                className="floor-remove"
                onClick={() => setFloors((rows) => rows.filter((_, i) => i !== index))}
                disabled={!authed}
                aria-label="Remove floor"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="floor-add"
            onClick={() => setFloors((rows) => [...rows, { client: "", floor: "" }])}
            disabled={!authed}
          >
            + add a floor
          </button>
        </div>
        <button
          type="button"
          className="try-submit"
          onClick={() => save("floors")}
          disabled={busy || !authed}
        >
          {busy ? "Saving…" : "Save floors"}
        </button>
      </div>

      <div className="settings-card">
        <h3 className="try-title">Qwen &amp; briefing</h3>
        <p className="try-sub">
          The daily cap counts every Qwen call across runs and briefings — past
          the cap, everything falls back to the scripted planner. The briefing
          time is when a scheduler should call POST /api/briefing/generate
          (Asia/Singapore).
        </p>
        <div className="runtime-grid">
          <label className="try-field">
            <span>Daily Qwen call cap</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={cap}
              onChange={(event) => setCap(event.target.value)}
              disabled={!authed}
            />
          </label>
          <label className="try-field">
            <span>Briefing time (SGT)</span>
            <input
              type="time"
              value={briefingTime}
              onChange={(event) => setBriefingTime(event.target.value)}
              disabled={!authed}
            />
          </label>
        </div>
        <button
          type="button"
          className="try-submit"
          onClick={() => save("runtime")}
          disabled={busy || !authed}
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </section>
  );
}
