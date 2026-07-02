import React from 'react'

interface Props {
  nodeData: {
    name: string
    attributes?: {
      id?: string
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
  selected?: boolean
  onChain?: boolean
}

const DEPT_COLORS: Record<string, string> = {
  engineering: '#22c55e',
  sales: '#10b981',
  executive: '#f59e0b',
  ops: '#ef4444',
  finance: '#ec4899',
  hr: '#22c55e',
  'human resources': '#22c55e',
  marketing: '#3b82f6',
  design: '#06b6d4',
  legal: '#8b5cf6',
  product: '#f97316',
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
  const palette = ['#3b82f6', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#6366f1']
  return palette[Math.abs(hash) % palette.length]
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function PeopleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.5 14c0-2.21-1.34-4-3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function NodeCard({ nodeData, onSelect, onToggle, selected, onChain }: Props) {
  const { name, attributes = {}, children, __rd3t } = nodeData
  const { title, department, isExternal } = attributes
  const displayName = name === '—' ? 'Unknown Employee' : name
  const isUnknown = name === '—'
  const hasChildren = Array.isArray(children) && children.length > 0
  const childCount = hasChildren ? (children as unknown[]).length : 0
  const collapsed = __rd3t?.collapsed ?? false

  const deptLabel = (!department || department === '—')
    ? (isExternal ? 'External' : 'Unassigned')
    : department
  const color = deptColor(deptLabel)

  return (
    <div
      onClick={onSelect}
      style={{
        background: onChain && !selected ? 'rgba(245,158,11,0.04)' : 'var(--surface)',
        border: `1.5px solid ${selected ? '#3b82f6' : onChain ? '#f59e0b' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '12px 14px',
        width: 224,
        boxShadow: selected
          ? '0 0 0 3px rgba(59,130,246,0.18), 0 4px 12px rgba(0,0,0,0.1)'
          : onChain ? '0 0 0 2px rgba(245,158,11,0.2), 0 4px 12px rgba(0,0,0,0.07)'
          : 'var(--shadow-card)',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        userSelect: 'none',
      }}
    >
      {/* Department label */}
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color,
        marginBottom: 8,
      }}>
        {deptLabel}
      </div>

      {/* Avatar + Name + Title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: isUnknown ? 'var(--border-subtle)' : `${color}18`,
          color: isUnknown ? 'var(--text-muted)' : color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
          border: `1.5px solid ${isUnknown ? 'var(--border)' : `${color}35`}`,
        }}>
          {isUnknown ? '?' : initials(displayName)}
        </div>
        <div style={{ minWidth: 0, paddingTop: 1 }}>
          <div style={{
            fontWeight: 700,
            fontSize: 14,
            color: isUnknown ? 'var(--text-muted)' : 'var(--text)',
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {displayName}
          </div>
          {title && title !== '—' && (
            <div style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginTop: 2,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {title}
            </div>
          )}
        </div>
      </div>

      {/* Direct reports pill */}
      {hasChildren && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle?.() }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'var(--border-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '4px 10px',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
          >
            <PeopleIcon />
            <span>{childCount}</span>
            <svg
              width="9"
              height="9"
              viewBox="0 0 10 10"
              style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <path d="M1.5 3.5 L5 7 L8.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
