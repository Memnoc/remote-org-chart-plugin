import React, { useState, useMemo, useEffect, useRef } from "react";
import { useOrg } from "./hooks/useOrg.ts";
import TreeView from "./components/TreeView.tsx";
import ListView from "./components/ListView.tsx";
import DetailPanel from "./components/DetailPanel.tsx";
import type { PersonDetail } from "./components/DetailPanel.tsx";
import { deptColor } from "./components/NodeCard.tsx";
import StatsPanel, { computeStats } from "./components/StatsPanel.tsx";
import type { OrgNode } from "../shared/types.js";

type ViewMode = "tree" | "list";

function countNodes(node: OrgNode): number {
  return 1 + (node.children ?? []).reduce((n, c) => n + countNodes(c), 0);
}

function filterByDept(forest: OrgNode[], depts: Set<string>): OrgNode[] {
  function nodeMatches(node: OrgNode): boolean {
    const d = (!node.attributes.department || node.attributes.department === "—")
      ? "Unassigned"
      : node.attributes.department;
    return depts.has(d);
  }
  function keep(node: OrgNode): OrgNode | null {
    const childMatches = (node.children ?? []).flatMap((c) => { const r = keep(c); return r ? [r] : []; });
    if (nodeMatches(node) || childMatches.length > 0)
      return { ...node, children: childMatches.length ? childMatches : node.children };
    return null;
  }
  return forest.flatMap((r) => { const res = keep(r); return res ? [res] : []; });
}

function filterForest(forest: OrgNode[], query: string): OrgNode[] {
  if (!query) return forest;
  const q = query.toLowerCase();
  function matchesNode(node: OrgNode): boolean {
    return node.name.toLowerCase().includes(q)
      || (node.attributes.title ?? "").toLowerCase().includes(q)
      || (node.attributes.department ?? "").toLowerCase().includes(q);
  }
  function filterNode(node: OrgNode): OrgNode | null {
    const childMatches = (node.children ?? []).flatMap((c) => { const r = filterNode(c); return r ? [r] : []; });
    if (matchesNode(node) || childMatches.length > 0)
      return { ...node, children: childMatches.length ? childMatches : node.children };
    return null;
  }
  return forest.flatMap((root) => { const r = filterNode(root); return r ? [r] : []; });
}

function flattenForest(forest: OrgNode[], parentName = ""): string[][] {
  const rows: string[][] = [];
  for (const node of forest) {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    rows.push([esc(node.name), esc(node.attributes.title ?? ""), esc(node.attributes.department ?? ""), esc(parentName), node.attributes.isExternal ? "Yes" : "No"]);
    rows.push(...flattenForest(node.children ?? [], node.name));
  }
  return rows;
}

function exportCSV(forest: OrgNode[]) {
  const header = ["Name", "Title", "Department", "Manager", "External"];
  const csv = [header, ...flattenForest(forest)].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "org-chart.csv"; a.click();
  URL.revokeObjectURL(url);
}

function readParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    view: (p.get("view") as ViewMode) ?? "tree",
    search: p.get("q") ?? "",
    depts: p.get("depts") ? new Set(p.get("depts")!.split(",")) : new Set<string>(),
  };
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ transition: "transform 0.4s", transform: spinning ? "rotate(360deg)" : "none" }}>
      <path d="M1 7a6 6 0 0 1 10.39-4M13 7a6 6 0 0 1-10.39 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <polyline points="11,3 11.39,3 13,1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="3,11 2.61,11 1,13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
      <line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="1" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="2.93" y1="2.93" x2="4.34" y2="4.34" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="11.66" y1="11.66" x2="13.07" y2="13.07" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="11.66" y1="4.34" x2="13.07" y2="2.93" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="2.93" y1="13.07" x2="4.34" y2="11.66" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="5" y1="14" x2="11" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="11" x2="8" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

type ThemeMode = 'light' | 'dark' | 'system'
const THEME_LABELS: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' }

function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="4" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const { refresh, ...state } = useOrg();
  const init = readParams();
  const [view, setView] = useState<ViewMode>(init.view);
  const [search, setSearch] = useState(init.search);
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem('theme') as ThemeMode) ?? 'system');
  const [sysDark, setSysDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [themeOpen, setThemeOpen] = useState(false);
  const [activeDepts, setActiveDepts] = useState<Set<string>>(init.depts);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonDetail | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const themeBtnRef = useRef<HTMLButtonElement>(null);
  const themePanelRef = useRef<HTMLDivElement>(null);

  const dark = theme === 'system' ? sysDark : theme === 'dark';

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setSearch(""); searchRef.current?.blur(); setFilterOpen(false); setThemeOpen(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (themeOpen
        && !themeBtnRef.current?.contains(e.target as Node)
        && !themePanelRef.current?.contains(e.target as Node)) {
        setThemeOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [themeOpen]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (filterOpen
        && !filterBtnRef.current?.contains(e.target as Node)
        && !filterPanelRef.current?.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [filterOpen]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (view !== "tree") p.set("view", view);
    if (search) p.set("q", search);
    if (activeDepts.size > 0) p.set("depts", [...activeDepts].join(","));
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [view, search, activeDepts]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark, sysDark, theme]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function toggleDept(dept: string) {
    setActiveDepts((prev) => {
      const next = new Set(prev);
      next.has(dept) ? next.delete(dept) : next.add(dept);
      return next;
    });
  }

  const allNodes = useMemo(() => {
    if (state.status !== "ok") return [] as OrgNode[];
    const nodes: OrgNode[] = [];
    function flatten(n: OrgNode) { nodes.push(n); n.children?.forEach(flatten); }
    state.data.forest.forEach(flatten);
    return nodes;
  }, [state]);

  const deptList = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of allNodes) {
      const d = (!n.attributes.department || n.attributes.department === "—") ? "Unassigned" : n.attributes.department;
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [allNodes]);

  const filteredForest = useMemo(() => {
    if (state.status !== "ok") return [];
    const afterSearch = filterForest(state.data.forest, search);
    if (activeDepts.size === 0) return afterSearch;
    return filterByDept(afterSearch, activeDepts);
  }, [state, search, activeDepts]);

  const orgStats = useMemo(
    () => state.status === "ok" ? computeStats(allNodes, state.data.forest) : null,
    [allNodes, state],
  );

  const isLive = state.status === "ok" && state.data.source === "live";
  const totalPeople = allNodes.length;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
      <DetailPanel person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      {orgStats && <StatsPanel stats={orgStats} open={statsOpen} onClose={() => setStatsOpen(false)} />}

      {/* Header */}
      <div style={{
        height: 52,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 12,
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        zIndex: 30,
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #5b21b6, #c4a7e7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 12px rgba(91,33,182,0.35)",
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="3" r="2" fill="white" />
              <circle cx="3" cy="12" r="2" fill="white" />
              <circle cx="13" cy="12" r="2" fill="white" />
              <line x1="8" y1="5" x2="3" y2="10" stroke="white" strokeWidth="1.2" />
              <line x1="8" y1="5" x2="13" y2="10" stroke="white" strokeWidth="1.2" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Org Chart Plugin
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {state.status === "ok" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: isLive ? "var(--success)" : "var(--warning)",
            }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
              {isLive ? "Live" : "Snapshot"}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
              · {new Date(state.data.fetchedAt).toLocaleTimeString()}
            </span>
            <button onClick={handleRefresh} disabled={refreshing} title="Refresh" style={iconBtnStyle}>
              <RefreshIcon spinning={refreshing} />
            </button>
          </div>
        )}

        <div style={{ position: "relative" }}>
          <button
            ref={themeBtnRef}
            onClick={() => setThemeOpen((o) => !o)}
            title="Theme"
            style={iconBtnStyle}
          >
            {theme === 'dark' ? <MoonIcon /> : theme === 'light' ? <SunIcon /> : <SystemIcon />}
          </button>
          {themeOpen && (
            <div ref={themePanelRef} style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              padding: "6px", zIndex: 100, minWidth: 130,
            }}>
              {(["light", "dark", "system"] as ThemeMode[]).map((m) => (
                <button key={m} onClick={() => { setTheme(m); setThemeOpen(false); }} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "7px 10px", border: "none", borderRadius: 7,
                  background: theme === m ? "var(--border-subtle)" : "transparent",
                  color: theme === m ? "var(--text)" : "var(--text-muted)",
                  fontWeight: theme === m ? 600 : 400, fontSize: 13, cursor: "pointer", textAlign: "left",
                }}>
                  {m === 'light' ? <SunIcon /> : m === 'dark' ? <MoonIcon /> : <SystemIcon />}
                  {THEME_LABELS[m]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
        position: "relative",
        zIndex: 20,
      }}>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="6" cy="6" r="4.5" stroke="var(--text-subtle)" strokeWidth="1.4" />
            <line x1="9.5" y1="9.5" x2="12.5" y2="12.5" stroke="var(--text-subtle)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search by name or title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "8px 14px 8px 34px",
              borderRadius: 20,
              border: "1.5px solid var(--border)",
              fontSize: 13,
              width: 240,
              outline: "none",
              background: "var(--surface)",
              color: "var(--text)",
            }}
          />
        </div>

        {/* Filter */}
        <div style={{ position: "relative" }}>
          <button
            ref={filterBtnRef}
            onClick={() => setFilterOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 20,
              border: `1.5px solid ${activeDepts.size > 0 ? "#3b82f6" : "var(--border)"}`,
              background: activeDepts.size > 0 ? "rgba(59,130,246,0.06)" : "var(--surface)",
              color: activeDepts.size > 0 ? "#3b82f6" : "var(--text-muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <FilterIcon />
            Filter
            {activeDepts.size > 0 && (
              <span style={{
                background: "#3b82f6", color: "#fff",
                borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px",
              }}>
                {activeDepts.size}
              </span>
            )}
          </button>

          {filterOpen && (
            <div
              ref={filterPanelRef}
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                padding: "16px 18px",
                zIndex: 100,
                minWidth: 260,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Department
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflowY: "auto" }}>
                {deptList.map(([dept, count]) => {
                  const c = deptColor(dept);
                  const active = activeDepts.has(dept);
                  return (
                    <label key={dept} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 8px", borderRadius: 8, cursor: "pointer",
                      background: active ? `${c}10` : "transparent",
                    }}>
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleDept(dept)}
                        style={{ accentColor: c, width: 14, height: 14, flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: active ? 600 : 400, flex: 1 }}>
                        {dept}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{count}</span>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => setActiveDepts(new Set())}
                  style={{ flex: 1, padding: "8px", borderRadius: 20, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Reset
                </button>
                <button
                  onClick={() => setFilterOpen(false)}
                  style={{ flex: 1, padding: "8px", borderRadius: 20, border: "none", background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Apply filters
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: "flex", gap: 4, background: "var(--border-subtle)", borderRadius: 20, padding: "3px" }}>
          {(["tree", "list"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "5px 14px", borderRadius: 17, border: "none",
                background: view === v ? "var(--surface)" : "transparent",
                color: view === v ? "var(--text)" : "var(--text-muted)",
                fontWeight: view === v ? 600 : 500,
                fontSize: 12, cursor: "pointer",
                boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s",
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {state.status === "ok" && (
          <button
            onClick={() => setStatsOpen((o) => !o)}
            style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1.5px solid ${statsOpen ? "#f59e0b" : "var(--border)"}`,
              background: statsOpen ? "rgba(245,158,11,0.06)" : "var(--surface)",
              color: statsOpen ? "#f59e0b" : "var(--text-muted)",
            }}
          >
            Stats
          </button>
        )}
        {state.status === "ok" && (
          <button
            onClick={() => exportCSV(state.data.forest)}
            style={{ padding: "7px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Main content */}
      {state.status === "loading" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-subtle)", fontSize: 14 }}>
          Loading org data…
        </div>
      )}
      {state.status === "error" && (
        <div style={{ margin: 20, padding: 16, color: "var(--danger)", background: "var(--primary-light)", borderRadius: 10, border: "1px solid var(--primary-mid)", fontSize: 13 }}>
          Failed to load org data: {state.message}
        </div>
      )}
      {state.status === "ok" && (
        view === "tree" ? (
          <TreeView forest={filteredForest} onSelect={setSelectedPerson} totalPeople={totalPeople} />
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: "var(--bg)" }}>
            <ListView forest={filteredForest} search={search} />
          </div>
        )
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 30, height: 30,
  border: "1.5px solid var(--border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0, padding: 0,
};
