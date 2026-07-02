import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useOrg } from './hooks/useOrg.ts'
import { useTheme } from './hooks/useTheme.ts'
import Header from './components/Header.tsx'
import Toolbar from './components/Toolbar.tsx'
import TreeView from './components/TreeView.tsx'
import ListView from './components/ListView.tsx'
import DetailPanel from './components/DetailPanel.tsx'
import type { PersonDetail } from './components/DetailPanel.tsx'
import StatsPanel, { computeStats } from './components/StatsPanel.tsx'
import type { OrgNode } from '../shared/types.js'
import { filterForest, filterByDept, exportCSV, readParams } from './lib/orgUtils.ts'
import type { ViewMode } from './lib/orgUtils.ts'

export default function App() {
  const { refresh, ...state } = useOrg()
  const { theme, setTheme } = useTheme()
  const init = readParams()
  const [view, setView] = useState<ViewMode>(init.view)
  const [search, setSearch] = useState(init.search)
  const [activeDepts, setActiveDepts] = useState<Set<string>>(init.depts)
  const [selectedPerson, setSelectedPerson] = useState<PersonDetail | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape') { setSearch(''); searchRef.current?.blur() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const p = new URLSearchParams()
    if (view !== 'tree') p.set('view', view)
    if (search) p.set('q', search)
    if (activeDepts.size > 0) p.set('depts', [...activeDepts].join(','))
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [view, search, activeDepts])

  const allNodes = useMemo(() => {
    if (state.status !== 'ok') return [] as OrgNode[]
    const nodes: OrgNode[] = []
    function flatten(n: OrgNode) { nodes.push(n); n.children?.forEach(flatten) }
    state.data.forest.forEach(flatten)
    return nodes
  }, [state])

  const deptList = useMemo(() => {
    const map = new Map<string, number>()
    for (const n of allNodes) {
      const d = (!n.attributes.department || n.attributes.department === '—') ? 'Unassigned' : n.attributes.department
      map.set(d, (map.get(d) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [allNodes])

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
      next.has(dept) ? next.delete(dept) : next.add(dept)
      return next
    })
  }

  const hasData = state.status === 'ok'

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <DetailPanel person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      {orgStats && <StatsPanel stats={orgStats} open={statsOpen} onClose={() => setStatsOpen(false)} />}

      <Header
        theme={theme}
        setTheme={setTheme}
        status={state.status}
        source={hasData ? state.data.source : undefined}
        fetchedAt={hasData ? state.data.fetchedAt : undefined}
        onRefresh={refresh}
      />

      <Toolbar
        search={search}
        searchRef={searchRef}
        onSearch={setSearch}
        activeDepts={activeDepts}
        deptList={deptList}
        onToggleDept={toggleDept}
        onResetDepts={() => setActiveDepts(new Set())}
        view={view}
        onViewChange={setView}
        statsOpen={statsOpen}
        onStatsToggle={() => setStatsOpen((o) => !o)}
        onExportCSV={() => state.status === 'ok' && exportCSV(state.data.forest)}
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--bg)' }}>
            <ListView forest={filteredForest} search={search} />
          </div>
        )
      )}
    </div>
  )
}
