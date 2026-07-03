import React, { useState, useMemo, useRef } from 'react'
import type { OrgNode } from '../../shared/types.js'
import NodeCard from './NodeCard.tsx'
import SingleTree from './SingleTree.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'
import { PlusIcon, MinusIcon, PersonIcon, zoomBtnStyle } from './icons.tsx'
import { findSubtree, findChain } from '../lib/forestNav.ts'
import { toPersonDetail, type PersonDetail } from '../lib/orgPresentation.ts'

interface Props {
  forest: OrgNode[]
  onSelect?: (person: PersonDetail) => void
  totalPeople?: number
}

export default function TreeView({ forest, onSelect, totalPeople }: Props) {
  const [expandMode, setExpandMode] = useState<'all' | 'collapsed' | 'default'>('default')
  const [treeKey, setTreeKey] = useState(0)
  const [zoom, setZoom] = useState(0.8)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const scrollRef = useRef<HTMLDivElement>(null)
  const SCROLL_STEP = 240

  function pan(dx: number, dy: number) {
    if (dx !== 0) setPanOffset((p) => ({ ...p, x: p.x + dx }))
    if (dy !== 0) scrollRef.current?.scrollBy({ top: dy, behavior: 'smooth' })
  }

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

  const mainTrees = displayForest.filter((r) => (r.children?.length ?? 0) > 0)
  const loneNodes = displayForest.filter((r) => !r.children?.length)
  const initialDepth = expandMode === 'collapsed' ? 0 : undefined

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
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600,
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
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '6px 14px', fontSize: 13, color: 'var(--text)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)', pointerEvents: 'none',
        }}>
          {focusedId
            ? <><strong>{focusedNode?.name ?? ''}</strong>'s team · <strong>{displayCount}</strong> people</>
            : <>Org <strong>{displayCount}</strong> people</>
          }
        </div>
      </div>

      {/* Expand / Collapse all */}
      {mainTrees.length > 0 && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 6 }}>
          {(['all', 'collapsed'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => applyMode(mode)}
              style={{
                fontSize: 11, fontWeight: expandMode === mode ? 700 : 500,
                padding: '5px 12px', borderRadius: 20,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: expandMode === mode ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              }}
            >
              {mode === 'all' ? 'Expand all' : 'Collapse all'}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable tree area */}
      <div ref={scrollRef} style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 60, paddingBottom: 64 }}>
        {mainTrees.map((root, i) => (
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
            />
          </ErrorBoundary>
        ))}

        {loneNodes.length > 0 && (
          <div style={{ padding: '24px 40px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              No reporting line · {loneNodes.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {loneNodes.map((node, i) => (
                <NodeCard
                  key={node.attributes.id ?? i}
                  nodeData={node}
                  selected={node.attributes.id === selectedId}
                  onClick={() => setSelectedId(node.attributes.id ?? null)}
                  onProfile={onSelect ? () => {
                    setSelectedId(node.attributes.id ?? null)
                    onSelect(toPersonDetail(node))
                  } : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 10,
        display: 'flex', alignItems: 'center',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden',
      }}>
        <button onClick={() => changeZoom(0.1)} style={zoomBtnStyle} title="Zoom in"><PlusIcon /></button>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 42, textAlign: 'center', padding: '0 4px' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => changeZoom(-0.1)} style={zoomBtnStyle} title="Zoom out"><MinusIcon /></button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
        <button onClick={() => { setZoom(0.8); setPanOffset({ x: 0, y: 0 }) }} style={{ ...zoomBtnStyle, gap: 6, padding: '8px 12px' }} title="Reset zoom">
          <PersonIcon />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Reset View</span>
        </button>
      </div>

      {/* D-pad navigator */}
      <div style={{
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
      </div>
    </div>
  )
}
