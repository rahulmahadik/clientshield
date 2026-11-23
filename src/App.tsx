import { useEffect, useState } from "react";
import { TodayPage } from "./pages/TodayPage";
import { FilesPage } from "./pages/FilesPage";
import { RulesPage } from "./pages/RulesPage";
import { LogPage } from "./pages/LogPage";
import { AgentsPage } from "./pages/AgentsPage";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { ScenariosPage } from "./pages/ScenariosPage";
import { BriefingPage } from "./pages/BriefingPage";
import { ConnectPage } from "./pages/ConnectPage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { SettingsPage } from "./pages/SettingsPage";
import { GuidePage } from "./pages/GuidePage";
import { AboutPage } from "./pages/AboutPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { fetchAuthState, fetchPendingApprovals, login, logout } from "./api";
import {
  IconBook,
  IconCheckCircle,
  IconFile,
  IconFlask,
  IconGear,
  IconHome,
  IconInfo,
  IconList,
  IconLogin,
  IconLogout,
  IconNews,
  IconPanelCollapse,
  IconPanelExpand,
  IconPlug,
  IconRobot,
  IconScale,
} from "./icons";

type PageId =
  | "today"
  | "briefing"
  | "files"
  | "rules"
  | "agents"
  | "log"
  | "approvals"
  | "scenarios"
  | "connect"
  | "how"
  | "settings"
  | "guide"
  | "about"
  | "privacy";

import type { ComponentType } from "react";

interface NavItem {
  id: PageId;
  label: string;
  icon: ComponentType;
}

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { id: "today", label: "Today", icon: IconHome },
      { id: "briefing", label: "Briefing", icon: IconNews },
    ],
  },
  {
    title: "Oversight",
    items: [
      { id: "agents", label: "Agents", icon: IconRobot },
      { id: "approvals", label: "Approvals", icon: IconCheckCircle },
      { id: "log", label: "Log", icon: IconList },
      { id: "scenarios", label: "Scenarios", icon: IconFlask },
    ],
  },
  {
    title: "Learn",
    items: [
      { id: "how", label: "How it works", icon: IconInfo },
      { id: "guide", label: "User guide", icon: IconBook },
      { id: "connect", label: "Connect", icon: IconPlug },
    ],
  },
  {
    title: "Data",
    items: [
      { id: "files", label: "Files", icon: IconFile },
      { id: "rules", label: "Rules", icon: IconScale },
    ],
  },
];

const SETTINGS_ITEM: NavItem = { id: "settings", label: "Settings", icon: IconGear };

const PAGE_PATHS: Partial<Record<PageId, string>> = {
  today: "/today",
  briefing: "/briefing",
  agents: "/agents",
  approvals: "/approvals",
  log: "/log",
  scenarios: "/scenarios",
  settings: "/settings",
  guide: "/guide",
  connect: "/connect",
  how: "/how",
  files: "/files",
  rules: "/rules",
  about: "/about",
  privacy: "/privacy",
};

function pageFromPath(pathname: string): PageId {
  const clean = pathname.replace(/\/+$/, "") || "/today";
  const entry = (Object.entries(PAGE_PATHS) as [PageId, string][]).find(
    ([, pagePath]) => pagePath === clean,
  );
  return entry?.[0] ?? "today";
}

function useApprovalCount(active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const load = () => {
      fetchPendingApprovals()
        .then((pending) => {
          if (!cancelled) setCount(pending.length);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active]);
  return count;
}

function SignInModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
      onSuccess();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "invalid_credentials"
          ? "Wrong username or password."
          : "Sign-in failed; please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h3 className="modal-title">Sign in as the owner</h3>
        <p className="modal-sub">
          Approving, pausing agents, replaying the day and changing settings
          need the owner. Everything else stays open.
        </p>
        <form onSubmit={submit} className="modal-form">
          <label className="try-field">
            <span>Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="try-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </label>
          <button type="submit" className="try-submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {error && <p className="try-error">{error}</p>}
        <p className="modal-demo">
          Demo login — username <code>owner</code> · password{" "}
          <code>clientshield</code>
        </p>
      </div>
    </div>
  );
}

export function App() {
  const [page, setPage] = useState<PageId>(() => pageFromPath(window.location.pathname));
  const [todayRefreshKey, setTodayRefreshKey] = useState(0);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [agentsPreset, setAgentsPreset] = useState<{
    rogue: boolean;
    agentId: string;
    task: string;
  } | null>(null);
  const [logFocus, setLogFocus] = useState<{ rule?: string; id?: number } | null>(null);
  const approvalCount = useApprovalCount(true);

  useEffect(() => {
    const stored = window.localStorage.getItem("cs-theme");
    document.documentElement.dataset.theme = stored === "light" ? "light" : "dark";
    setCollapsed(window.localStorage.getItem("cs-sidebar") === "collapsed");
    fetchAuthState().then(setAuthed).catch(() => setAuthed(false));
    const onLoginRequired = () => {
      setAuthed(false);
      setShowSignIn(true);
    };
    window.addEventListener("cs-login-required", onLoginRequired);
    return () => window.removeEventListener("cs-login-required", onLoginRequired);
  }, []);

  // Real URLs: back/forward and refresh keep the page.
  useEffect(() => {
    const onPopState = () => {
      setPage(pageFromPath(window.location.pathname));
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Page title follows the active page.
  useEffect(() => {
    const all = [SETTINGS_ITEM, ...SECTIONS.flatMap((section) => section.items)];
    const item = all.find((candidate) => candidate.id === page);
    document.title =
      page === "about"
        ? "About · ClientShield"
        : page === "privacy"
          ? "Privacy · ClientShield"
          : `${item?.label ?? "ClientShield"} · ClientShield`;
  }, [page]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("cs-sidebar", next ? "collapsed" : "open");
      return next;
    });
  }

  // "[" toggles the rail; clicking empty rail space toggles it too.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "[") return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (!window.matchMedia("(min-width: 861px)").matches) return;
      toggleCollapsed();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onRailClick(event: React.MouseEvent<HTMLElement>) {
    if (!window.matchMedia("(min-width: 861px)").matches) return;
    if ((event.target as HTMLElement).closest("button, a, input")) return;
    toggleCollapsed();
  }

  function goPage(next: PageId, options: { replace?: boolean } = {}) {
    setPage(next);
    setDrawerOpen(false);
    window.scrollTo(0, 0);
    const path = PAGE_PATHS[next] ?? "/today";
    if (window.location.pathname !== path) {
      if (options.replace) {
        window.history.replaceState({}, "", path);
      } else {
        window.history.pushState({}, "", path);
      }
    }
  }

  // The logo is a real link to "/": navigates home, or reloads Today's data
  // when we are already there.
  function onLogoClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setDrawerOpen(false);
    if (page !== "today") {
      goPage("today");
    } else {
      window.scrollTo(0, 0);
      setTodayRefreshKey((key) => key + 1);
    }
  }

  function navigateFromWelcome(target: "agents" | "log" | "briefing") {
    if (target === "agents") {
      setAgentsPreset({
        rogue: true,
        agentId: "sales-agent",
        task: "Greenstep wants a match, close it this week",
      });
    }
    if (target === "log") {
      setLogFocus({ rule: "R18" });
    }
    goPage(target);
  }

  function seeWhy(actionId: number) {
    setLogFocus({ id: actionId });
    goPage("log");
  }

  async function signOut() {
    await logout().catch(() => {});
    setAuthed(false);
  }

  const renderNavItem = (item: NavItem) => (
    <button
      key={item.id}
      type="button"
      className={`nav-link ${page === item.id ? "nav-active" : ""}`}
      aria-current={page === item.id ? "page" : undefined}
      title={item.label}
      onClick={() => {
        setLogFocus(null);
        goPage(item.id);
      }}
    >
      <span className="nav-icon" aria-hidden>
        <item.icon />
        {item.id === "approvals" && approvalCount > 0 && (
          <span className="nav-dot" title={`${approvalCount} waiting`} />
        )}
      </span>
      <span className="nav-label">{item.label}</span>
      {item.id === "approvals" && approvalCount > 0 && (
        <span className="nav-badge">{approvalCount}</span>
      )}
    </button>
  );

  return (
    <div className="shell">
      <header className="topbar">
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-label="Menu"
        >
          ☰
        </button>
        <a
          href="/"
          className="topbar-brand"
          onClick={onLogoClick}
          title="ClientShield — Today"
        >
          <span aria-hidden>⛨</span> ClientShield
        </a>
        {authed ? (
          <button type="button" className="signout-button" onClick={signOut}>
            sign out
          </button>
        ) : (
          <button
            type="button"
            className="signin-button"
            onClick={() => setShowSignIn(true)}
          >
            sign in
          </button>
        )}
      </header>
      <div
        className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${drawerOpen ? "sidebar-open" : ""}`}
        onClick={onRailClick}
      >
        <div className="sidebar-top">
          <a
            href="/"
            className="brand"
            onClick={onLogoClick}
            title="ClientShield — Today"
          >
            <span className="brand-mark" aria-hidden>
              ⛨
            </span>
            <span className="brand-text">
              <span className="brand-name">ClientShield</span>
              <span className="brand-tag">
                watching the agents of a one-person company
              </span>
            </span>
          </a>
        </div>
        <nav className="nav" aria-label="Sections">
          {SECTIONS.map((section) => (
            <div key={section.title} className="nav-section">
              <span className="nav-section-title" title={collapsed ? section.title : undefined}>
                {section.title}
              </span>
              {section.items.map(renderNavItem)}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          {renderNavItem(SETTINGS_ITEM)}
          {authed ? (
            <button type="button" className="signout-button" onClick={signOut} title="Sign out (owner)">
              <span className="nav-icon" aria-hidden>
                <IconLogout />
              </span>
              <span className="nav-label">Sign out (owner)</span>
            </button>
          ) : (
            <button
              type="button"
              className="signin-button"
              onClick={() => setShowSignIn(true)}
              title="Sign in as the owner"
            >
              <span className="nav-icon" aria-hidden>
                <IconLogin />
              </span>
              <span className="nav-label">Sign in as owner</span>
            </button>
          )}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar (or press [)" : "Collapse sidebar (or press [)"}
          >
            <span className="nav-icon" aria-hidden>
              {collapsed ? <IconPanelExpand /> : <IconPanelCollapse />}
            </span>
            <span className="nav-label">Collapse</span>
          </button>
        </div>
      </div>
      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
      )}
      <main className="content">
        {page === "today" ? (
          <TodayPage
            refreshKey={todayRefreshKey}
            onNavigate={(target) =>
              target === "approvals" ? goPage("approvals") : navigateFromWelcome(target)
            }
            onSeeWhy={seeWhy}
          />
        ) : page === "briefing" ? (
          <BriefingPage onOpenApprovals={() => goPage("approvals")} />
        ) : page === "files" ? (
          <FilesPage />
        ) : page === "rules" ? (
          <RulesPage />
        ) : page === "log" ? (
          <LogPage focus={logFocus} />
        ) : page === "agents" ? (
          <AgentsPage
            preset={agentsPreset}
            onPresetConsumed={() => setAgentsPreset(null)}
          />
        ) : page === "approvals" ? (
          <ApprovalsPage />
        ) : page === "scenarios" ? (
          <ScenariosPage />
        ) : page === "connect" ? (
          <ConnectPage />
        ) : page === "how" ? (
          <HowItWorksPage />
        ) : page === "guide" ? (
          <GuidePage />
        ) : page === "about" ? (
          <AboutPage />
        ) : page === "privacy" ? (
          <PrivacyPage />
        ) : (
          <SettingsPage authed={authed === true} onSignIn={() => setShowSignIn(true)} />
        )}
      </main>
      <footer className="footer">
        <span>
          ClientShield · oversight for one-person companies running AI agents ·
          demo data: Lumen Studio
        </span>
        <span className="footer-links">
          <a
            href="https://clientshield.geo.hashmeta.tech"
            target="_blank"
            rel="noopener noreferrer"
          >
            Product website
          </a>
          <button type="button" onClick={() => goPage("about")}>
            About
          </button>
          <button type="button" onClick={() => goPage("privacy")}>
            Privacy
          </button>
        </span>
      </footer>
      {showSignIn && (
        <SignInModal
          onClose={() => setShowSignIn(false)}
          onSuccess={() => {
            setAuthed(true);
            setShowSignIn(false);
          }}
        />
      )}
    </div>
  );
}
