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
 * chain); isExternal/missing dept tint the department label & avatar;
 * attributes.badge (external manager / cycle) renders an amber warning chip.
 * The virtual root renders as the "Organisation" company node (early return).
 */
import React from 'react'
import { deptColor, initials } from '../lib/orgPresentation.ts'
import { IS_SAFARI } from '../lib/browser.ts'

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

/** People in the subtrees under the virtual root — shown on the company node. */
function countPeople(children?: unknown[]): number {
  let n = 0
  for (const c of (children ?? []) as { children?: unknown[] }[]) n += 1 + countPeople(c.children)
  return n
}

function BuildingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 5h1.5M8.5 5H10M6 7.5h1.5M8.5 7.5H10M6 10h1.5M8.5 10H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 14v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Expand/collapse chevron. Safari can't have the rotate transform inside a
 * foreignObject (mispositions the whole card — see lib/browser.ts), so it
 * gets a pre-rotated path instead of the animated rotation.
 */
function Chevron({ collapsed }: { collapsed: boolean }) {
  const down = 'M1.5 3.5 L5 7 L8.5 3.5'
  const right = 'M3.5 1.5 L7 5 L3.5 8.5'
  return (
    <svg
      width="9" height="9" viewBox="0 0 10 10"
      style={IS_SAFARI ? undefined : { transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
    >
      <path d={IS_SAFARI && collapsed ? right : down} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
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
  const { title, department, isExternal, badge } = attributes
  // Card shows a short label (the full external-manager string is too long for
  // a chip); hover and the detail drawer carry the full badge text.
  const badgeLabel = badge?.startsWith('reports to') ? 'External manager' : badge
  const isUnknown = !name
  const displayName = name || 'Unknown Employee'
  const hasChildren = Array.isArray(children) && children.length > 0
  const childCount = hasChildren ? (children as unknown[]).length : 0

  // Synthetic org root — a company node, not a person card. Vertically
  // centred in the 200px foreignObject frame so the trunk line emerges at
  // its bottom edge (same no-gap trick as person cards).
  if (attributes.isVirtual) {
    const totalPeople = countPeople(children)
    return (
      <div style={{ width: 224, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle?.() }}
          title={`${childCount} ${childCount === 1 ? 'person has' : 'people have'} nobody above them on Remote — this node groups their trees so the whole company reads as one chart. Click to ${collapsed ? 'expand' : 'collapse'}.`}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'var(--surface)', border: '1.5px solid var(--border)',
            borderRadius: 12, padding: '12px 20px', cursor: 'pointer',
            boxShadow: 'var(--shadow-card)', userSelect: 'none',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            <BuildingIcon />
            Organisation
            <Chevron collapsed={collapsed} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
            {totalPeople} people · {childCount} {childCount === 1 ? 'branch' : 'branches'}
          </span>
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
        // No `position` here on purpose: nothing in the card is absolutely
        // positioned, and `position` inside a foreignObject makes Safari
        // paint the card at the SVG origin (see lib/browser.ts).
        opacity: dimmed ? 0.45 : 1,
        // Chain tint layered over the opaque surface — a bare rgba() here is
        // ~transparent and lets the connector stub behind the card bleed through.
        background: onChain && !selected
          ? 'linear-gradient(rgba(245,158,11,0.04), rgba(245,158,11,0.04)), var(--surface)'
          : 'var(--surface)',
        border: `1.5px solid ${selected ? '#3b82f6' : onChain ? '#f59e0b' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '12px 14px',
        width: 224,
        boxShadow: selected
          ? '0 0 0 3px rgba(59,130,246,0.18), 0 4px 12px rgba(0,0,0,0.1)'
          : onChain ? '0 0 0 2px rgba(245,158,11,0.2), 0 4px 12px rgba(0,0,0,0.07)'
          : 'var(--shadow-card)',
        cursor: onCardClick ? 'pointer' : 'default',
        transition: IS_SAFARI ? undefined : 'box-shadow 0.15s, border-color 0.15s, opacity 0.15s',
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

      {/* Edge-case badge (external manager / cycle) — amber warning chip */}
      {badge && (
        <div style={{ marginTop: 8 }}>
          <span title={badge} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            fontWeight: 600,
            color: '#b45309',
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: 20,
            padding: '3px 9px',
            letterSpacing: '0.02em',
          }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M8 2 L14.5 13.5 H1.5 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M8 6.5 V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11.6" r="0.8" fill="currentColor" />
            </svg>
            {badgeLabel}
          </span>
        </div>
      )}

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
              transition: IS_SAFARI ? undefined : 'background 0.1s',
            }}
          >
            <PeopleIcon />
            <span>{childCount}</span>
            <Chevron collapsed={collapsed} />
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
