import React from 'react'

interface Props {
  nodeData: {
    name: string
    attributes?: {
      title?: string
      department?: string
      badge?: string
      isExternal?: boolean
    }
    children?: unknown[]
    __rd3t?: { collapsed: boolean }
  }
  onSelect?: () => void
  onToggle?: () => void
}

const DEPT_COLORS: Record<string, string> = {
  engineering: '#6366f1',
  sales: '#10b981',
  executive: '#f59e0b',
  ops: '#ef4444',
  finance: '#0ea5e9',
  hr: '#ec4899',
  marketing: '#8b5cf6',
  design: '#14b8a6',
  external: '#64748b',
  unassigned: '#94a3b8',
}

export function deptColor(department?: string): string {
  if (!department || department === '—') return '#94a3b8'
  const key = department.toLowerCase()
  for (const [k, v] of Object.entries(DEPT_COLORS)) {
    if (key.includes(k)) return v
  }
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash)
  const palette = ['#6366f1','#10b981','#f59e0b','#0ea5e9','#ec4899','#8b5cf6','#14b8a6','#f97316']
  return palette[Math.abs(hash) % palette.length]
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

export default function NodeCard({ nodeData, onSelect, onToggle }: Props) {
  const { name, attributes = {}, children, __rd3t } = nodeData
  const { title, department, isExternal } = attributes
  const displayName = name === '—' ? 'Unknown Employee' : name
  const isUnknown = name === '—'
  const hasChildren = Array.isArray(children) && children.length > 0
  const collapsed = __rd3t?.collapsed ?? false
  const color = deptColor(department)

  return (
    <div
      onClick={onSelect}
      style={{
        background: 'var(--card-gradient)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '12px 14px 12px 12px',
        width: 210,
        boxShadow: 'var(--shadow-card)',
        textAlign: 'left',
        position: 'relative',
        borderLeft: `4px solid ${color}`,
        cursor: onSelect ? 'pointer' : 'default',
      }}>

      {/* Avatar + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingRight: hasChildren ? 22 : 0 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: isUnknown ? 'var(--border-subtle)' : `${color}18`,
          color: isUnknown ? 'var(--text-muted)' : color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
          border: `1.5px solid ${color}30`,
        }}>
          {isUnknown ? '?' : initials(displayName)}
        </div>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: isUnknown ? 'var(--text-muted)' : 'var(--text)', lineHeight: 1.25 }}>
          {displayName}
        </div>
      </div>

      {/* Title */}
      {title && title !== '—' && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 7, marginLeft: 41, lineHeight: 1.3 }}>
          {title}
        </div>
      )}

      {/* Department pill + external tag */}
      <div style={{ marginTop: 6, marginLeft: 41, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        {(() => {
          const deptLabel = (!department || department === '—')
            ? (isExternal ? 'External' : 'Unassigned')
            : department
          const c = deptColor(deptLabel)
          return (
            <span style={{
              fontSize: 10, fontWeight: 600, color: c,
              background: `${c}18`, borderRadius: 20,
              padding: '2px 8px', display: 'inline-block', letterSpacing: '0.02em',
            }}>
              {deptLabel}
            </span>
          )
        })()}
        {isExternal && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: '#64748b', background: 'var(--border-subtle)',
            borderRadius: 20, padding: '2px 7px',
            display: 'inline-block', letterSpacing: '0.02em',
          }}>
            Contractor
          </span>
        )}
      </div>

      {/* Expand/collapse chevron */}
      {hasChildren && (
        <div onClick={(e) => { e.stopPropagation(); onToggle?.() }} style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: collapsed ? color : 'var(--border-subtle)',
          border: `1.5px solid ${collapsed ? color : 'var(--border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            style={{
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <path
              d="M1.5 3.5 L5 7 L8.5 3.5"
              stroke={collapsed ? '#fff' : 'var(--text-secondary)'}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
      )}
    </div>
  )
}
