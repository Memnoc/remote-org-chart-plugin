import React, { useState, useRef, useEffect } from 'react'
import type { ViewMode } from '../lib/orgUtils.ts'
import { FilterIcon } from './icons.tsx'
import { deptColor } from './NodeCard.tsx'

interface Props {
  search: string
  searchRef: React.RefObject<HTMLInputElement>
  onSearch: (q: string) => void
  activeDepts: Set<string>
  deptList: [string, number][]
  onToggleDept: (dept: string) => void
  onResetDepts: () => void
  view: ViewMode
  onViewChange: (v: ViewMode) => void
  statsOpen: boolean
  onStatsToggle: () => void
  onExportCSV: () => void
  hasData: boolean
}

export default function Toolbar({
  search, searchRef, onSearch,
  activeDepts, deptList, onToggleDept, onResetDepts,
  view, onViewChange,
  statsOpen, onStatsToggle,
  onExportCSV, hasData,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const filterPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFilterOpen(false)
    }
    function onClickOutside(e: MouseEvent) {
      if (filterOpen
        && !filterBtnRef.current?.contains(e.target as Node)
        && !filterPanelRef.current?.contains(e.target as Node))
        setFilterOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [filterOpen])

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
      position: 'relative',
      zIndex: 20,
    }}>
      <div style={{ position: 'relative' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="6" cy="6" r="4.5" stroke="var(--text-subtle)" strokeWidth="1.4" />
          <line x1="9.5" y1="9.5" x2="12.5" y2="12.5" stroke="var(--text-subtle)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          ref={searchRef}
          type="search"
          placeholder="Search by name or title"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          style={{
            padding: '8px 14px 8px 34px',
            borderRadius: 20,
            border: '1.5px solid var(--border)',
            fontSize: 13,
            width: 240,
            outline: 'none',
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
        />
      </div>

      <div style={{ position: 'relative' }}>
        <button
          ref={filterBtnRef}
          onClick={() => setFilterOpen((o) => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 20,
            border: `1.5px solid ${activeDepts.size > 0 ? '#3b82f6' : 'var(--border)'}`,
            background: activeDepts.size > 0 ? 'rgba(59,130,246,0.06)' : 'var(--surface)',
            color: activeDepts.size > 0 ? '#3b82f6' : 'var(--text-muted)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <FilterIcon />
          Filter
          {activeDepts.size > 0 && (
            <span style={{
              background: '#3b82f6', color: '#fff',
              borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px',
            }}>
              {activeDepts.size}
            </span>
          )}
        </button>

        {filterOpen && (
          <div ref={filterPanelRef} style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            padding: '16px 18px',
            zIndex: 100,
            minWidth: 260,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Department
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
              {deptList.map(([dept, count]) => {
                const c = deptColor(dept)
                const active = activeDepts.has(dept)
                return (
                  <label key={dept} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                    background: active ? `${c}10` : 'transparent',
                  }}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => onToggleDept(dept)}
                      style={{ accentColor: c, width: 14, height: 14, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: active ? 600 : 400, flex: 1 }}>
                      {dept}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{count}</span>
                  </label>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <button
                onClick={onResetDepts}
                style={{ flex: 1, padding: '8px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Reset
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                style={{ flex: 1, padding: '8px', borderRadius: 20, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Apply filters
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 4, background: 'var(--border-subtle)', borderRadius: 20, padding: '3px' }}>
        {(['tree', 'list'] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            style={{
              padding: '5px 14px', borderRadius: 17, border: 'none',
              background: view === v ? 'var(--surface)' : 'transparent',
              color: view === v ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: view === v ? 600 : 500,
              fontSize: 12, cursor: 'pointer',
              boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {hasData && (
        <button
          onClick={onStatsToggle}
          style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1.5px solid ${statsOpen ? '#f59e0b' : 'var(--border)'}`,
            background: statsOpen ? 'rgba(245,158,11,0.06)' : 'var(--surface)',
            color: statsOpen ? '#f59e0b' : 'var(--text-muted)',
          }}
        >
          Stats
        </button>
      )}
      {hasData && (
        <button
          onClick={onExportCSV}
          style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Export CSV
        </button>
      )}
    </div>
  )
}
