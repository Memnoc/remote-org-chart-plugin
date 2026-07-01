import React from 'react'
import type { OrgNode } from '../../shared/types.js'
import { deptColor } from './NodeCard.tsx'

interface Props {
  forest: OrgNode[]
  filteredCount: number
}

function flatten(node: OrgNode, out: OrgNode[]) {
  out.push(node)
  node.children?.forEach((c) => flatten(c, out))
}

export default function StatsBar({ forest, filteredCount }: Props) {
  const all = React.useMemo(() => {
    const nodes: OrgNode[] = []
    forest.forEach((r) => flatten(r, nodes))
    return nodes
  }, [forest])

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

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {deptCounts.map(([dept, count]) => {
          const c = deptColor(dept)
          return (
            <span key={dept} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              color: c,
              background: `${c}15`,
              border: `1px solid ${c}30`,
              borderRadius: 20,
              padding: '3px 9px',
              letterSpacing: '0.01em',
            }}>
              {dept}
              <span style={{ fontWeight: 700, opacity: 0.8 }}>{count}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
