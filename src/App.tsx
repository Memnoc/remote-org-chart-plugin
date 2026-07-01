import React, { useState, useMemo, useEffect } from "react";
import { useOrg } from "./hooks/useOrg.ts";
import TreeView from "./components/TreeView.tsx";
import ListView from "./components/ListView.tsx";
import StatsBar from "./components/StatsBar.tsx";
import type { OrgNode } from "../shared/types.js";

type ViewMode = "tree" | "list";

function countNodes(node: OrgNode): number {
  return 1 + (node.children ?? []).reduce((n, c) => n + countNodes(c), 0);
}

function filterByDept(forest: OrgNode[], depts: Set<string>): OrgNode[] {
  function nodeMatches(node: OrgNode): boolean {
    const d =
      !node.attributes.department || node.attributes.department === "—"
        ? "Unassigned"
        : node.attributes.department;
    return depts.has(d);
  }
  function keep(node: OrgNode): OrgNode | null {
    const childMatches = (node.children ?? []).flatMap((c) => {
      const r = keep(c);
      return r ? [r] : [];
    });
    if (nodeMatches(node) || childMatches.length > 0)
      return {
        ...node,
        children: childMatches.length ? childMatches : node.children,
      };
    return null;
  }
  return forest.flatMap((r) => {
    const res = keep(r);
    return res ? [res] : [];
  });
}

function filterForest(forest: OrgNode[], query: string): OrgNode[] {
  if (!query) return forest;
  const q = query.toLowerCase();

  function matchesNode(node: OrgNode): boolean {
    return (
      node.name.toLowerCase().includes(q) ||
      (node.attributes.title ?? "").toLowerCase().includes(q) ||
      (node.attributes.department ?? "").toLowerCase().includes(q)
    );
  }

  function filterNode(node: OrgNode): OrgNode | null {
    const childMatches = (node.children ?? []).flatMap((c) => {
      const r = filterNode(c);
      return r ? [r] : [];
    });
    if (matchesNode(node) || childMatches.length > 0) {
      return {
        ...node,
        children: childMatches.length ? childMatches : node.children,
      };
    }
    return null;
  }

  return forest.flatMap((root) => {
    const r = filterNode(root);
    return r ? [r] : [];
  });
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
      <line
        x1="8"
        y1="1"
        x2="8"
        y2="3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="13"
        x2="8"
        y2="15"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="1"
        y1="8"
        x2="3"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="13"
        y1="8"
        x2="15"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="2.93"
        y1="2.93"
        x2="4.34"
        y2="4.34"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="11.66"
        y1="11.66"
        x2="13.07"
        y2="13.07"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="11.66"
        y1="4.34"
        x2="13.07"
        y2="2.93"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="2.93"
        y1="13.07"
        x2="4.34"
        y2="11.66"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{ transition: "transform 0.4s", transform: spinning ? "rotate(360deg)" : "none" }}
    >
      <path
        d="M1 7a6 6 0 0 1 10.39-4M13 7a6 6 0 0 1-10.39 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <polyline points="11,3 11.39,3 13,1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="3,11 2.61,11 1,13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const { refresh, ...state } = useOrg();
  const [view, setView] = useState<ViewMode>("tree");
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [activeDepts, setActiveDepts] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearch("");
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light",
    );
  }, [dark]);

  function toggleDept(dept: string) {
    setActiveDepts((prev) => {
      const next = new Set(prev);
      next.has(dept) ? next.delete(dept) : next.add(dept);
      return next;
    });
  }

  const filteredForest = useMemo(() => {
    if (state.status !== "ok") return [];
    const afterSearch = filterForest(state.data.forest, search);
    if (activeDepts.size === 0) return afterSearch;
    return filterByDept(afterSearch, activeDepts);
  }, [state, search, activeDepts]);

  const isLive = state.status === "ok" && state.data.source === "live";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Top bar */}
      <div
        style={{
          background: "var(--nav-gradient)",
          borderBottom: "1px solid var(--border)",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 60,
          boxShadow: "0 1px 4px var(--shadow-primary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--primary), #fb923c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(244,63,94,0.3)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="3" r="2" fill="white" />
              <circle cx="3" cy="12" r="2" fill="white" />
              <circle cx="13" cy="12" r="2" fill="white" />
              <line
                x1="8"
                y1="5"
                x2="3"
                y2="10"
                stroke="white"
                strokeWidth="1.2"
              />
              <line
                x1="8"
                y1="5"
                x2="13"
                y2="10"
                stroke="white"
                strokeWidth="1.2"
              />
            </svg>
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 17,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            Remote Org Chart Plugin
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {state.status === "ok" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: isLive ? "var(--success)" : "var(--warning)",
                  boxShadow: isLive
                    ? "0 0 0 2px rgba(16,185,129,0.2)"
                    : "0 0 0 2px rgba(245,158,11,0.2)",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                {isLive ? "Live — Remote API" : "Snapshot (fallback)"}
              </span>
              <span style={{ color: "var(--primary-mid)", fontSize: 12 }}>
                ·
              </span>
              <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>
                {new Date(state.data.fetchedAt).toLocaleTimeString()}
              </span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh data"
                style={{
                  width: 24,
                  height: 24,
                  border: "1.5px solid var(--border)",
                  borderRadius: 6,
                  background: "var(--surface)",
                  color: "var(--text-muted)",
                  cursor: refreshing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: refreshing ? 0.5 : 1,
                  transition: "all 0.15s",
                  flexShrink: 0,
                  padding: 0,
                }}
              >
                <RefreshIcon spinning={refreshing} />
              </button>
            </div>
          )}

          <button
            onClick={() => setDark((d) => !d)}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              width: 32,
              height: 32,
              border: "1.5px solid var(--border)",
              borderRadius: 8,
              background: "var(--surface)",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "28px 32px" }}>
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 24,
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: "0 0 auto" }}>
            <svg
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
              }}
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <circle
                cx="6"
                cy="6"
                r="4.5"
                stroke="var(--text-subtle)"
                strokeWidth="1.4"
              />
              <line
                x1="9.5"
                y1="9.5"
                x2="12.5"
                y2="12.5"
                stroke="var(--text-subtle)"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <input
              ref={searchRef}
              type="search"
              placeholder="Search name, title, department… (press /)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "9px 14px 9px 32px",
                borderRadius: 9,
                border: "1.5px solid var(--border)",
                fontSize: 13,
                width: 290,
                outline: "none",
                background: "var(--surface)",
                color: "var(--text)",
                boxShadow: "0 1px 2px var(--shadow-primary)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 0,
              background: "var(--surface)",
              border: "1.5px solid var(--border)",
              borderRadius: 9,
              overflow: "hidden",
              boxShadow: "0 1px 2px var(--shadow-primary)",
            }}
          >
            {(["tree", "list"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "8px 18px",
                  border: "none",
                  background:
                    view === v
                      ? "linear-gradient(135deg, var(--primary) 0%, #f97316 100%)"
                      : "transparent",
                  color: view === v ? "#fff" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  letterSpacing: "0.01em",
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {state.status === "ok" && (
          <StatsBar
            forest={state.data.forest}
            filteredCount={filteredForest.reduce(
              (n, r) => n + countNodes(r),
              0,
            )}
            activeDepts={activeDepts}
            onToggleDept={toggleDept}
          />
        )}

        {state.status === "loading" && (
          <div
            style={{
              padding: 80,
              textAlign: "center",
              color: "var(--text-subtle)",
              fontSize: 14,
            }}
          >
            Loading org data…
          </div>
        )}
        {state.status === "error" && (
          <div
            style={{
              padding: 24,
              color: "var(--danger)",
              background: "var(--primary-light)",
              borderRadius: 12,
              border: "1px solid var(--primary-mid)",
              fontSize: 13,
            }}
          >
            Failed to load org data: {state.message}
          </div>
        )}
        {state.status === "ok" &&
          (view === "tree" ? (
            <TreeView forest={filteredForest} />
          ) : (
            <ListView forest={filteredForest} search={search} />
          ))}
      </div>
    </div>
  );
}
