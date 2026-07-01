import React from 'react'
import type { OrgNode } from '../../shared/types.js'
import { deptColor } from './NodeCard.tsx'

interface Props {
  forest: OrgNode[]
  filteredForest: OrgNode[]
  filteredCount: number
  activeDepts: Set<string>
  onToggleDept: (dept: string) => void
}

function flatten(node: OrgNode, out: OrgNode[]) {
  out.push(node)
  node.children?.forEach((c) => flatten(c, out))
}

export default function StatsBar({ forest, filteredForest, filteredCount, activeDepts, onToggleDept }: Props) {
  const all = React.useMemo(() => {
    const nodes: OrgNode[] = []
    forest.forEach((r) => flatten(r, nodes))
    return nodes
  }, [forest])

  const filteredDeptCounts = React.useMemo(() => {
    const nodes: OrgNode[] = []
    filteredForest.forEach((r) => flatten(r, nodes))
    const map = new Map<string, number>()
    for (const n of nodes) {
      const d = (!n.attributes.department || n.attributes.department === '—') ? 'Unassigned' : n.attributes.department
      map.set(d, (map.get(d) ?? 0) + 1)
    }
    return map
  }, [filteredForest])

  const total = all.length

  const deptCounts = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const n of all) {
      const d = (!n.attributes.department || n.attributes.department === '—')
        ? 'Unassigned'
        : n.attributes.department
      map.set(d, (map.get(d) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [all])

  const showFiltered = filteredCount !== total
  const hasActiveFilter = activeDepts.size > 0

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20,
      padding: '10px 14px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      boxShadow: '0 1px 3px var(--shadow-primary)',
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexShrink: 0 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>employees</span>
        {showFiltered && (
          <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, marginLeft: 4 }}>
            ({filteredCount} shown)
          </span>
        )}
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {deptCounts.map(([dept, count]) => {
          const c = deptColor(dept)
          const active = activeDepts.has(dept)
          const dimmed = hasActiveFilter && !active
          const filteredDeptCount = filteredDeptCounts.get(dept) ?? 0
          const showRatio = hasActiveFilter && filteredDeptCount !== count
          return (
            <button
              key={dept}
              onClick={() => onToggleDept(dept)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                background: active ? `linear-gradient(135deg, ${c}, ${c}bb)` : `linear-gradient(135deg, ${c}, ${c}99)`,
                WebkitBackgroundClip: active ? undefined : 'text',
                WebkitTextFillColor: active ? '#fff' : 'transparent',
                backgroundClip: active ? undefined : 'text',
                border: `1px solid ${active ? c : `${c}45`}`,
                borderRadius: 20,
                padding: '3px 10px',
                letterSpacing: '0.01em',
                cursor: 'pointer',
                opacity: dimmed ? 0.35 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {dept}
              {' '}
              <span>
                {showRatio ? `${filteredDeptCount}/${count}` : count}
              </span>
            </button>
          )
        })}
        {hasActiveFilter && (
          <button
            onClick={() => activeDepts.forEach((d) => onToggleDept(d))}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '3px 9px',
              cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
