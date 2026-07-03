/**
 * NodeCard — one person on the canvas. Pure presentational: receives plain
 * data + callbacks, knows nothing about react-d3-tree (SingleTree adapts).
 *
 * Interaction zones on a card:
 *   card body        → onClick   (select: blue ring + detail drawer + chain)
 *   ↗ button         → onProfile (select AND open drawer explicitly)
 *   count pill       → onToggle  (expand/collapse this subtree)
 *   "View team →"    → onFocus   (Subtree Focus mode)
 * Pill/team buttons stopPropagation so they don't also select the card.
 *
 * Visual states: selected = blue border+glow; onChain = amber (reporting
 * chain); isExternal/missing dept tint the department label & avatar.
 * The virtual "Org" root renders the compact chip in the early return below.
 */
import React from 'react'
import { deptColor, initials } from '../lib/orgPresentation.ts'

interface Props {
  nodeData: {
    name: string
    attributes?: {
      id?: string
      title?: string
      department?: string
      badge?: string
      isExternal?: boolean
      isVirtual?: boolean
      isContext?: boolean
    }
    children?: unknown[]
  }
  collapsed?: boolean
  onClick?: () => void
  onProfile?: () => void
  onToggle?: () => void
  onFocus?: () => void
  selected?: boolean
  onChain?: boolean
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

export default function NodeCard({ nodeData, collapsed = false, onClick: onCardClick, onProfile, onToggle, onFocus, selected, onChain }: Props) {
  const { name, attributes = {}, children } = nodeData
  const { title, department, isExternal } = attributes
  const isUnknown = !name
  const displayName = name || 'Unknown Employee'
  const hasChildren = Array.isArray(children) && children.length > 0
  const childCount = hasChildren ? (children as unknown[]).length : 0

  // Synthetic org root — compact chip, not a person card
  if (attributes.isVirtual) {
    return (
      <div style={{ width: 224, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle?.() }}
          title={collapsed ? 'Expand org' : 'Collapse org'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
            background: 'var(--surface)', border: '1.5px solid var(--border)',
            borderRadius: 20, padding: '7px 16px', cursor: 'pointer',
            boxShadow: 'var(--shadow-card)', userSelect: 'none',
          }}
        >
          <PeopleIcon />
          <span>Org</span>
          <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>· {childCount} {childCount === 1 ? 'branch' : 'branches'}</span>
          <svg
            width="9" height="9" viewBox="0 0 10 10"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <path d="M1.5 3.5 L5 7 L8.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
      </div>
    )
  }

  const deptLabel = department ?? (isExternal ? 'External' : 'Unassigned')
  const color = deptColor(deptLabel)
  // Filter-context ancestor (kept only so a match keeps its chain) — dimmed
  // so matches pop. Selection/chain interaction overrides the dim.
  const dimmed = Boolean(attributes.isContext) && !selected && !onChain

  return (
    <div
      onClick={onCardClick}
      style={{
        position: 'relative',
        opacity: dimmed ? 0.45 : 1,
        background: onChain && !selected ? 'rgba(245,158,11,0.04)' : 'var(--surface)',
        border: `1.5px solid ${selected ? '#3b82f6' : onChain ? '#f59e0b' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '12px 14px',
        width: 224,
        boxShadow: selected
          ? '0 0 0 3px rgba(59,130,246,0.18), 0 4px 12px rgba(0,0,0,0.1)'
          : onChain ? '0 0 0 2px rgba(245,158,11,0.2), 0 4px 12px rgba(0,0,0,0.07)'
          : 'var(--shadow-card)',
        cursor: onCardClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, border-color 0.15s, opacity 0.15s',
        userSelect: 'none',
      }}
    >
      {/* Department label + profile button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color,
        }}>
          {deptLabel}
        </div>
        {onProfile && (
          <button
            onClick={(e) => { e.stopPropagation(); onProfile() }}
            title="View profile"
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              border: '1px solid var(--border)',
              background: 'var(--border-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            ↗
          </button>
        )}
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
          <div title={displayName} style={{
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
          {title && (
            // Two-line clamp, not single-line ellipsis: job titles are the
            // longest field and a mid-word cut reads badly. The foreignObject
            // frame (240×200) leaves ~80px headroom, so one extra line never
            // clips or detaches connectors. Full text on hover via title attr.
            <div title={title} style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginTop: 2,
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {title}
            </div>
          )}
        </div>
      </div>

      {/* Direct reports pill + View team */}
      {hasChildren && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              width="9" height="9" viewBox="0 0 10 10"
              style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <path d="M1.5 3.5 L5 7 L8.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
          {onFocus && (
            <button
              onClick={(e) => { e.stopPropagation(); onFocus() }}
              title="Focus on this team"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: color,
                background: `${color}14`,
                border: `1px solid ${color}30`,
                borderRadius: 20,
                padding: '3px 9px',
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              View team →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
