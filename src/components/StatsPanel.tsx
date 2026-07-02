import React from 'react'
import type { OrgNode } from '../../shared/types.js'
import { deptColor, isEmpty } from '../lib/orgUtils.ts'

interface Stats {
  total: number
  managers: number
  avgSpan: number
  deepest: number
  deptList: [string, number][]
}

export function computeStats(allNodes: OrgNode[], forest: OrgNode[]): Stats {
  const managers = allNodes.filter((n) => (n.children?.length ?? 0) > 0)
  const avgSpan = managers.length > 0
    ? managers.reduce((s, m) => s + (m.children?.length ?? 0), 0) / managers.length
    : 0

  function maxDepth(node: OrgNode): number {
    if (!node.children?.length) return 1
    return 1 + Math.max(...node.children.map(maxDepth))
  }
  const deepest = forest.length > 0 ? Math.max(...forest.map(maxDepth)) : 0

  const deptMap = new Map<string, number>()
  for (const n of allNodes) {
    const d = isEmpty(n.attributes.department) ? 'Unassigned' : n.attributes.department!
    deptMap.set(d, (deptMap.get(d) ?? 0) + 1)
  }
  const deptList = [...deptMap.entries()].sort((a, b) => b[1] - a[1])

  return { total: allNodes.length, managers: managers.length, avgSpan: +avgSpan.toFixed(1), deepest, deptList }
}

// Rosé Pine pastel accents
const STAT_ACCENTS = ['#ebbcba', '#9ccfd8', '#f6c177', '#c4a7e7']

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div style={{
      background: `${accent}12`,
      border: `1px solid ${accent}30`,
      borderRadius: 10,
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  )
}

interface Props {
  stats: Stats
  open: boolean
  onClose: () => void
}

export default function StatsPanel({ stats, open, onClose }: Props) {
  const maxCount = stats.deptList[0]?.[1] ?? 1

  return (
    <>
      {open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
      )}

      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: 300,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{
          padding: '18px 18px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Org Stats</span>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatCard label="Total employees" value={stats.total} accent={STAT_ACCENTS[0]} />
            <StatCard label="Managers" value={stats.managers} sub={`${stats.total - stats.managers} ICs`} accent={STAT_ACCENTS[1]} />
            <StatCard label="Avg span of control" value={stats.avgSpan} sub="direct reports / manager" accent={STAT_ACCENTS[2]} />
            <StatCard label="Deepest chain" value={stats.deepest} sub="reporting levels" accent={STAT_ACCENTS[3]} />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              By Department
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {stats.deptList.map(([dept, count]) => {
                const color = deptColor(dept)
                const pct = (count / maxCount) * 100
                return (
                  <div key={dept}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{dept}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontWeight: 500 }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: `${color}80`,
                        borderRadius: 2,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
