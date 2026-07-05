/**
 * TreeView — the canvas screen. Owns everything about how the org chart is
 * VIEWED (zoom, pan, expand/collapse, subtree focus, selection) but none of
 * the data: it receives an already-filtered forest from App.
 *
 * Layers of derived forest, in order:
 *   forest (prop, filtered) → displayForest (subtree when focused)
 *     → renderForest (joined under virtual "Org" root when multi-root)
 *
 * Key mechanisms a newcomer needs:
 * - treeKey: react-d3-tree has NO imperative expand/collapse API; bumping the
 *   React key remounts the tree with a new initialDepth. That is the
 *   expand/collapse-all implementation, and it deliberately resets viewport.
 * - renderForest MUST stay referentially stable across zoom/selection renders
 *   (useMemo below) — react-d3-tree wipes all collapse state whenever its
 *   `data` prop changes identity. This was a real bug: zoom used to
 *   re-expand every node.
 * - chainIds is computed from displayForest (real nodes only), so the
 *   virtual root never highlights as part of a reporting chain.
 *
 * Debugging: nodes re-expanding on unrelated interactions → something broke
 * renderForest's identity. Whole-org disappeared behind one node → check
 * initialDepth logic for the virtual root (must be 1, not 0, on collapse).
 */
import React, { useState, useMemo, useRef } from 'react'
import type { OrgNode } from '../../shared/types.js'
import SingleTree, { type LinkStyle } from './SingleTree.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'
import { PlusIcon, MinusIcon, PersonIcon, zoomBtnStyle } from './icons.tsx'
import { findSubtree, findChain, joinForest } from '../lib/forestNav.ts'
import type { PersonDetail } from '../lib/orgPresentation.ts'
import { useIsNarrow } from '../hooks/useIsNarrow.ts'

interface Props {
  forest: OrgNode[]
  onSelect?: (person: PersonDetail) => void
  totalPeople?: number
  /** True while search/department filters are active — auto-expands the collapsed-by-default tree so matches are visible. */
  hasActiveFilters?: boolean
  /** Connector style, owned by App (the toolbar control sets it). */
  linkStyle?: LinkStyle
}

/**
 * Canvas-overlay segmented control — same sliding-thumb style as the
 * toolbar's Tree/List switch (grey track, white thumb with a soft shadow).
 */
function SegmentedPill({ options, active, onChange }: {
  options: { value: string; label: string; title: string }[]
  active: string
  onChange: (value: string) => void
}) {
  return (
    <div style={{
      display: 'flex', gap: 4,
      background: 'var(--border-subtle)',
      borderRadius: 20, padding: 3,
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          title={o.title}
          style={{
            padding: '5px 14px', borderRadius: 17, border: 'none',
            background: active === o.value ? 'var(--surface)' : 'transparent',
            color: active === o.value ? 'var(--text)' : 'var(--text-muted)',
            fontWeight: active === o.value ? 600 : 500,
            fontSize: 12, cursor: 'pointer',
            boxShadow: active === o.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function TreeView({ forest, onSelect, totalPeople, hasActiveFilters = false, linkStyle = 'curve' }: Props) {
  const [expandMode, setExpandMode] = useState<'all' | 'collapsed' | 'default'>('default')
  const [treeKey, setTreeKey] = useState(0)
  // Phones start zoomed out: at 0.8 a 224px card nearly fills a 390pt
  // screen and the whole roots row lives off-canvas.
  const narrow = useIsNarrow()
  const initialZoom = narrow ? 0.45 : 0.8
  const [zoom, setZoom] = useState(initialZoom)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const scrollRef = useRef<HTMLDivElement>(null)
  const SCROLL_STEP = 240

  function pan(dx: number, dy: number) {
    if (dx !== 0) setPanOffset((p) => ({ ...p, x: p.x + dx }))
    if (dy !== 0) scrollRef.current?.scrollBy({ top: dy, behavior: 'smooth' })
  }

  // Subtree Focus ("View team →"): when focusedId is set, the canvas narrows
  // to that person's subtree. Falls back to the full forest if the id
  // vanished (e.g. filters removed it).
  const displayForest = useMemo(() => {
    if (!focusedId) return forest
    const sub = findSubtree(forest, focusedId)
    return sub ? [sub] : forest
  }, [forest, focusedId])

  const focusedNode = useMemo(
    () => focusedId ? findSubtree(forest, focusedId) : null,
    [forest, focusedId],
  )

  const chainIds = useMemo(
    () => selectedId ? findChain(displayForest, selectedId) : new Set<string>(),
    [displayForest, selectedId],
  )

  // Multi-root forests render as ONE expandable tree under a synthetic "Org"
  // root (render-layer only — data forest stays honest, see DECISIONS.md).
  // Memoized: react-d3-tree resets all collapse state whenever the `data`
  // prop changes identity, so the joined root must be stable across
  // re-renders (zoom, selection, pan).
  const renderForest = useMemo(() => joinForest(displayForest), [displayForest])

  function handleFocus(id: string) {
    setFocusedId(id)
    setSelectedId(null)
    setTreeKey((k) => k + 1)
    setPanOffset({ x: 0, y: 0 })
  }

  function handleBack() {
    setFocusedId(null)
    setSelectedId(null)
    setTreeKey((k) => k + 1)
    setPanOffset({ x: 0, y: 0 })
  }

  function applyMode(mode: 'all' | 'collapsed') {
    setExpandMode(mode)
    setTreeKey((k) => k + 1)
  }

  function changeZoom(delta: number) {
    setZoom((z) => Math.max(0.25, Math.min(2.5, +(z + delta).toFixed(2))))
  }

  const dpadBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: '100%',
    border: 'none', borderRadius: 6, padding: 0,
    background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
  }

  if (forest.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 14,
        background: 'var(--canvas-bg)',
        backgroundImage: 'radial-gradient(circle, var(--canvas-dots) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}>
        No results match current filters.
      </div>
    )
  }

  const hasVirtualRoot = renderForest[0]?.attributes.isVirtual === true
  // Depth 1 under a virtual root shows the Organisation node + top-level
  // roots; depth 0 would hide the whole org behind that single node.
  const collapsedDepth = hasVirtualRoot ? 1 : 0
  // Initial-depth policy:
  //   'all' / 'collapsed'  → explicit user override via the buttons
  //   'default'            → collapsed on app start, but auto-expanded while
  //                          searching/filtering (matches must be visible)
  //                          or when a team is focused ("View team →" should
  //                          show the team, not one lone card).
  const initialDepth =
    expandMode === 'all' ? undefined
    : expandMode === 'collapsed' ? collapsedDepth
    : (hasActiveFilters || focusedId) ? undefined : collapsedDepth

  const displayCount = totalPeople !== undefined && !focusedId
    ? totalPeople
    : displayForest.reduce(function count(n: number, node: OrgNode): number {
        return n + 1 + (node.children ?? []).reduce(count, 0)
      }, 0)

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'var(--canvas-bg)',
        backgroundImage: 'radial-gradient(circle, var(--canvas-dots) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        zIndex: 0,
      }} />

      {/* Org count / focused team badge */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        {focusedId && (
          <button
            onClick={handleBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600,
              color: 'var(--text)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Full org
          </button>
        )}
        <div style={{
          background: 'var(--surface)', border: '1.5px solid var(--border)',
          borderRadius: 20, padding: '6px 14px', fontSize: 12, color: 'var(--text)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)', pointerEvents: 'none',
        }}>
          {focusedId
            ? <><strong>{focusedNode?.name ?? ''}</strong>'s team · <strong>{displayCount}</strong> people</>
            : <>Org <strong>{displayCount}</strong> people</>
          }
        </div>
      </div>

      {/* Expand / Collapse all. In 'default' mode the highlighted segment
          mirrors what the tree actually shows (collapsed on start, expanded
          while filtering/focused) rather than showing no selection. */}
      {renderForest.some((r) => (r.children?.length ?? 0) > 0) && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
          <SegmentedPill
            options={[
              { value: 'all', label: 'Expand all', title: 'Expand every team' },
              { value: 'collapsed', label: 'Collapse all', title: 'Collapse to top level' },
            ]}
            active={expandMode !== 'default' ? expandMode : (initialDepth === undefined ? 'all' : 'collapsed')}
            onChange={(v) => applyMode(v as 'all' | 'collapsed')}
          />
        </div>
      )}

      {/* Scrollable tree area */}
      <div ref={scrollRef} style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 60, paddingBottom: 64 }}>
        {renderForest.map((root, i) => (
          <ErrorBoundary key={`${root.attributes.id ?? i}-${treeKey}`}>
            <SingleTree
              root={root}
              initialDepth={initialDepth}
              zoom={zoom}
              onSelect={onSelect}
              selectedId={selectedId}
              onSelectId={setSelectedId}
              chainIds={chainIds}
              onFocus={handleFocus}
              panOffset={panOffset}
              linkStyle={linkStyle}
            />
          </ErrorBoundary>
        ))}
      </div>

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 10,
        display: 'flex', alignItems: 'center',
        background: 'var(--surface)', border: '1.5px solid var(--border)',
        borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden',
      }}>
        <button onClick={() => changeZoom(0.1)} style={zoomBtnStyle} title="Zoom in"><PlusIcon /></button>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 42, textAlign: 'center', padding: '0 4px' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => changeZoom(-0.1)} style={zoomBtnStyle} title="Zoom out"><MinusIcon /></button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
        <button onClick={() => { setZoom(initialZoom); setPanOffset({ x: 0, y: 0 }) }} style={{ ...zoomBtnStyle, gap: 6, padding: '8px 12px' }} title="Reset zoom">
          <PersonIcon />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Reset View</span>
        </button>
      </div>

      {/* D-pad navigator — pointer-precision aid; phones pan by touch, and it
          would crowd the zoom bar at phone widths. */}
      {!narrow && <div style={{
        position: 'absolute', bottom: 16, right: 32, zIndex: 10,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        padding: 3,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 20px)',
        gridTemplateRows: 'repeat(3, 20px)',
        gap: 1,
        opacity: 0.7,
      }}>
        <span />
        <button style={dpadBtn} onClick={() => pan(0, -SCROLL_STEP)} title="Scroll up">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 8.5L6 4.5L10 8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span />
        <button style={dpadBtn} onClick={() => pan(-SCROLL_STEP, 0)} title="Pan left">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M8.5 2L4.5 6L8.5 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span />
        <button style={dpadBtn} onClick={() => pan(SCROLL_STEP, 0)} title="Pan right">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M3.5 2L7.5 6L3.5 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span />
        <button style={dpadBtn} onClick={() => pan(0, SCROLL_STEP)} title="Scroll down">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 3.5L6 7.5L10 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span />
      </div>}
    </div>
  )
}
