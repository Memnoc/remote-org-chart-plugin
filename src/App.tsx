/**
 * App — the composition root. All page-level state lives here and flows
 * down as props; there is no global store (see "No Global State Library"
 * in DECISIONS.md).
 *
 * State map:
 *   useOrg()        → server data (the only fetch in the app)
 *   useTheme()      → light/dark/system
 *   view/search/activeDepts → user filters, mirrored to the URL (?view=&q=&depts=)
 *   selectedPerson  → detail drawer;  statsOpen → stats drawer
 *
 * Render pipeline per keystroke:
 *   state.data.forest → filterForest(search) → filterByDept(depts)
 *     → TreeView (joins roots under a virtual "Org" node) or ListView.
 * Stats and CSV export intentionally use the UNfiltered forest.
 *
 * Debugging: filters behaving oddly → filteredForest memo below;
 * URL not updating → the replaceState effect; keyboard shortcuts dead →
 * the window keydown effect (it ignores keys typed into inputs).
 */
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useOrg } from './hooks/useOrg.ts'
import { useTheme } from './hooks/useTheme.ts'
import Header from './components/Header.tsx'
import Toolbar from './components/Toolbar.tsx'
import TreeView from './components/TreeView.tsx'
import ListView from './components/ListView.tsx'
import DetailPanel from './components/DetailPanel.tsx'
import StatsPanel from './components/StatsPanel.tsx'
import type { OrgNode } from '../shared/types.js'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { filterForest, filterByDept } from './lib/forestFilter.ts'
import { walkForest } from './lib/forestNav.ts'
import { computeStats, type PersonDetail } from './lib/orgPresentation.ts'
import { exportCSV } from './lib/orgExport.ts'
import { readParams, type ViewMode } from './lib/urlState.ts'

export default function App() {
  const { refresh, refreshing, ...state } = useOrg()
  const { theme, setTheme } = useTheme()
  const init = readParams()
  const [view, setView] = useState<ViewMode>(init.view)
  const [search, setSearch] = useState(init.search)
  const [activeDepts, setActiveDepts] = useState<Set<string>>(init.depts)
  const [selectedPerson, setSelectedPerson] = useState<PersonDetail | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  // Stable identity: DetailPanel's Esc-listener effect depends on onClose —
  // an inline arrow would re-attach the window listener on every App render
  // (react.dev/learn/removing-effect-dependencies).
  const closeDetail = useCallback(() => setSelectedPerson(null), [])
  const searchRef = useRef<HTMLInputElement>(null)

  // Global shortcuts: "/" focuses search (unless already typing in a field);
  // Esc clears search — but only when no detail panel is open, because the
  // panel owns Esc for closing itself (see DetailPanel). selectedPerson is a
  // real dependency: the listener re-attaches when selection changes, which
  // is user-paced and cheap (unlike per-keystroke churn).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape' && !selectedPerson) { setSearch(''); searchRef.current?.blur() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedPerson])

  // Write half of shareable-URL state (read half: lib/urlState.ts on mount).
  // replaceState, not pushState — filter tweaks shouldn't pollute Back-button
  // history. Defaults are omitted so the bare URL stays clean.
  useEffect(() => {
    const p = new URLSearchParams()
    if (view !== 'tree') p.set('view', view)
    if (search) p.set('q', search)
    if (activeDepts.size > 0) p.set('depts', [...activeDepts].join(','))
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [view, search, activeDepts])

  // Flat node list from the UNfiltered forest — feeds stats and headcount.
  const allNodes = useMemo(() => {
    if (state.status !== 'ok') return [] as OrgNode[]
    return walkForest(state.data.forest).map(({ node }) => node)
  }, [state])

  // The filter pipeline: search prunes first, then departments. Order
  // matters only for readability — both keep ancestors of matches.
  const filteredForest = useMemo(() => {
    if (state.status !== 'ok') return []
    const afterSearch = filterForest(state.data.forest, search)
    return activeDepts.size === 0 ? afterSearch : filterByDept(afterSearch, activeDepts)
  }, [state, search, activeDepts])

  const orgStats = useMemo(
    () => state.status === 'ok' ? computeStats(allNodes, state.data.forest) : null,
    [allNodes, state],
  )

  function toggleDept(dept: string) {
    setActiveDepts((prev) => {
      const next = new Set(prev)
      if (next.has(dept)) next.delete(dept)
      else next.add(dept)
      return next
    })
  }

  const hasData = state.status === 'ok'

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Ring 2 of 4 error boundaries. onRefresh gives the user a "Refresh
          data" escape hatch — plain Retry would re-render the same bad data
          and crash again (see ErrorBoundary.tsx). */}
      <ErrorBoundary onRefresh={refresh}>
        <DetailPanel person={selectedPerson} onClose={closeDetail} />
        {orgStats && <StatsPanel stats={orgStats} open={statsOpen} onClose={() => setStatsOpen(false)} />}

        <Header
          theme={theme}
          setTheme={setTheme}
          status={state.status}
          source={hasData ? state.data.source : undefined}
          fetchedAt={hasData ? state.data.fetchedAt : undefined}
          skippedCount={hasData ? state.data.skippedCount : undefined}
          onRefresh={refresh}
          refreshing={refreshing}
        />

        <Toolbar
          search={search}
          searchRef={searchRef}
          onSearch={setSearch}
          activeDepts={activeDepts}
          deptList={orgStats?.deptList ?? []}
          onToggleDept={toggleDept}
          onResetDepts={() => setActiveDepts(new Set())}
          view={view}
          onViewChange={setView}
          statsOpen={statsOpen}
          onStatsToggle={() => setStatsOpen((o) => !o)}
          onExportCSV={() => {
            if (state.status !== 'ok') return
            // try/catch, not ErrorBoundary: throws inside React synthetic
            // event handlers never reach boundaries.
            try { exportCSV(state.data.forest) } catch (e) { console.error('[export] CSV failed:', e) }
          }}
          hasData={hasData}
        />

        {state.status === 'loading' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: 14 }}>
            Loading org data…
          </div>
        )}
        {state.status === 'error' && (
          <div style={{ margin: 20, padding: 16, color: 'var(--danger)', background: 'var(--primary-light)', borderRadius: 10, border: '1px solid var(--primary-mid)', fontSize: 13 }}>
            Failed to load org data: {state.message}
          </div>
        )}
        {hasData && (
          view === 'tree' ? (
            <TreeView forest={filteredForest} onSelect={setSelectedPerson} totalPeople={allNodes.length} />
          ) : (
            <ErrorBoundary>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--bg)' }}>
                <ListView forest={filteredForest} search={search} />
              </div>
            </ErrorBoundary>
          )
        )}
      </ErrorBoundary>
    </div>
  )
}
