import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import Tree from 'react-d3-tree'
import type { CustomNodeElementProps } from 'react-d3-tree'
import type { OrgNode } from '../../shared/types.js'
import NodeCard, { deptColor } from './NodeCard.tsx'
import type { PersonDetail } from './DetailPanel.tsx'

function findSubtree(forest: OrgNode[], id: string): OrgNode | null {
  for (const node of forest) {
    if (node.attributes.id === id) return node
    const found = findSubtree(node.children ?? [], id)
    if (found) return found
  }
  return null
}

function findChain(forest: OrgNode[], targetId: string): Set<string> {
  function search(node: OrgNode, path: string[]): string[] | null {
    const id = node.attributes.id ?? ''
    const next = [...path, id]
    if (id === targetId) return next
    for (const child of node.children ?? []) {
      const r = search(child, next)
      if (r) return r
    }
    return null
  }
  for (const root of forest) {
    const r = search(root, [])
    if (r) return new Set(r)
  }
  return new Set()
}

interface Props {
  forest: OrgNode[]
  onSelect?: (person: PersonDetail) => void
  totalPeople?: number
}

function treeDepth(node: OrgNode): number {
  if (!node.children?.length) return 1
  return 1 + Math.max(...node.children.map(treeDepth))
}

function SingleTree({
  root,
  initialDepth,
  zoom,
  onSelect,
  selectedId,
  onSelectId,
  chainIds,
  onFocus,
}: {
  root: OrgNode
  initialDepth?: number
  zoom: number
  onSelect?: (p: PersonDetail) => void
  selectedId: string | null
  onSelectId: (id: string | null) => void
  chainIds: Set<string>
  onFocus: (id: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [translate, setTranslate] = useState({ x: 0, y: 80 })

  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect()
      setTranslate({ x: width / 2, y: 80 })
    }
  }, [])

  const depth = treeDepth(root)
  const height = Math.max(240, depth * 200 + 80)

  const renderNode = useCallback(
    ({ nodeDatum, toggleNode }: CustomNodeElementProps) => {
      const nd = nodeDatum as Parameters<typeof NodeCard>[0]['nodeData']
      const id = (nodeDatum.attributes as Record<string, unknown>)?.id as string ?? ''
      const hasKids = Array.isArray(nd.children) && nd.children.length > 0
      return (
        <foreignObject width={240} height={150} x={-120} y={-75} style={{ overflow: 'visible' }}>
          <NodeCard
            nodeData={nd}
            selected={!!id && id === selectedId}
            onChain={!!id && chainIds.has(id) && id !== selectedId}
            onToggle={toggleNode}
            onFocus={hasKids && id ? () => onFocus(id) : undefined}
            onSelect={() => {
              onSelectId(id || null)
              onSelect?.({
                name: nd.name,
                title: nd.attributes?.title,
                department: nd.attributes?.department,
                isExternal: nd.attributes?.isExternal,
                badge: nd.attributes?.badge,
              })
            }}
          />
        </foreignObject>
      )
    },
    [onSelect, selectedId, onSelectId, chainIds, onFocus],
  )

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height }}
    >
      <Tree
        data={root}
        orientation="vertical"
        pathFunc="step"
        translate={translate}
        separation={{ siblings: 1.4, nonSiblings: 1.8 }}
        renderCustomNodeElement={renderNode}
        nodeSize={{ x: 280, y: 210 }}
        zoom={zoom}
        enableLegacyTransitions
        collapsible
        initialDepth={initialDepth}
        pathClassFunc={({ source, target }) => {
          const srcId = (source.data.attributes as Record<string, unknown>)?.id as string ?? ''
          const tgtId = (target.data.attributes as Record<string, unknown>)?.id as string ?? ''
          return chainIds.has(srcId) && chainIds.has(tgtId) ? 'rd3t-link rd3t-link-chain' : 'rd3t-link'
        }}
      />
    </div>
  )
}

function LoneCard({ node, selected, onSelect, onSelectId }: {
  node: OrgNode
  selected: boolean
  onSelect?: (p: PersonDetail) => void
  onSelectId: (id: string | null) => void
}) {
  const { name, attributes } = node
  const { title, department, isExternal } = attributes
  const isUnknown = name === '—' && (!title || title === '—')
  const deptLabel = (!department || department === '—') ? (isExternal ? 'External' : 'Unassigned') : department
  const color = deptColor(deptLabel)
  const displayName = isUnknown ? 'Unknown Employee' : name
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase()

  return (
    <div
      onClick={() => {
        onSelectId(attributes.id ?? null)
        onSelect?.({ name, title, department, isExternal, badge: attributes.badge })
      }}
      style={{
        background: 'var(--surface)',
        border: `1.5px solid ${selected ? '#3b82f6' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '12px 14px',
        width: 224,
        boxShadow: selected
          ? '0 0 0 3px rgba(59,130,246,0.18), 0 4px 12px rgba(0,0,0,0.1)'
          : 'var(--shadow-card)',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color, marginBottom: 8 }}>
        {deptLabel}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: isUnknown ? 'var(--border-subtle)' : `${color}18`,
          color: isUnknown ? 'var(--text-muted)' : color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, flexShrink: 0,
          border: `1.5px solid ${isUnknown ? 'var(--border)' : `${color}35`}`,
        }}>
          {isUnknown ? '?' : initials}
        </div>
        <div style={{ minWidth: 0, paddingTop: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: isUnknown ? 'var(--text-muted)' : 'var(--text)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </div>
          {title && title !== '—' && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function MinusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function PersonIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.6" /><path d="M2 15c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
}

export default function TreeView({ forest, onSelect, totalPeople }: Props) {
  const [expandMode, setExpandMode] = useState<'all' | 'collapsed' | 'default'>('default')
  const [treeKey, setTreeKey] = useState(0)
  const [zoom, setZoom] = useState(0.8)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)

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
  }

  function handleBack() {
    setFocusedId(null)
    setSelectedId(null)
    setTreeKey((k) => k + 1)
  }

  function applyMode(mode: 'all' | 'collapsed') {
    setExpandMode(mode)
    setTreeKey((k) => k + 1)
  }

  function changeZoom(delta: number) {
    setZoom((z) => Math.max(0.25, Math.min(2.5, +(z + delta).toFixed(2))))
  }

  if (forest.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: 14,
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
      {/* Dot-grid canvas background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--canvas-bg)',
        backgroundImage: 'radial-gradient(circle, var(--canvas-dots) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        zIndex: 0,
      }} />

      {/* Org count badge / focused team label */}
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {focusedId && (
          <button
            onClick={handleBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600,
              color: 'var(--text)', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
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

      {/* Expand/collapse controls */}
      {mainTrees.length > 0 && (
        <div style={{
          position: 'absolute', top: 16, right: 16, zIndex: 10,
          display: 'flex', gap: 6,
        }}>
          {(['all', 'collapsed'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => applyMode(mode)}
              style={{
                fontSize: 11,
                fontWeight: expandMode === mode ? 700 : 500,
                padding: '5px 12px',
                borderRadius: 20,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: expandMode === mode ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              }}
            >
              {mode === 'all' ? 'Expand all' : 'Collapse all'}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable tree area */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: 60,
        paddingBottom: 64,
      }}>
        {mainTrees.map((root, i) => (
          <SingleTree
            key={`${root.attributes.id ?? i}-${treeKey}`}
            root={root}
            initialDepth={initialDepth}
            zoom={zoom}
            onSelect={onSelect}
            selectedId={selectedId}
            onSelectId={setSelectedId}
            chainIds={chainIds}
            onFocus={handleFocus}
          />
        ))}

        {loneNodes.length > 0 && (
          <div style={{ padding: '24px 40px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              No reporting line · {loneNodes.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {loneNodes.map((node, i) => (
                <LoneCard
                  key={node.attributes.id ?? i}
                  node={node}
                  selected={node.attributes.id === selectedId}
                  onSelect={onSelect}
                  onSelectId={setSelectedId}
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
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        overflow: 'hidden',
      }}>
        <button
          onClick={() => changeZoom(0.1)}
          style={zoomBtnStyle}
          title="Zoom in"
        >
          <PlusIcon />
        </button>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 42, textAlign: 'center', padding: '0 4px' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => changeZoom(-0.1)}
          style={zoomBtnStyle}
          title="Zoom out"
        >
          <MinusIcon />
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
        <button
          onClick={() => setZoom(0.8)}
          style={{ ...zoomBtnStyle, gap: 6, padding: '8px 12px' }}
          title="Reset zoom"
        >
          <PersonIcon />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Reset View</span>
        </button>
      </div>
    </div>
  )
}

const zoomBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 10px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
}
