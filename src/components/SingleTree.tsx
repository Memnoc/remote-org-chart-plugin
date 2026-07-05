/**
 * SingleTree — the adapter between react-d3-tree and the rest of the app.
 * Renders ONE root (TreeView hands it the joined forest) and translates
 * library concepts into ours:
 *   renderCustomNodeElement → NodeCard inside a <foreignObject>
 *   pathFunc                → custom Bézier or rounded elbow (linkStyle prop)
 *                             from card-bottom to card-top
 *   pathClassFunc           → amber chain-highlight class on connector links
 *   __rd3t.collapsed        → explicit `collapsed` prop for NodeCard
 *
 * All react-d3-tree internals stop here on purpose — NodeCard knows nothing
 * about the library (see "NodeCard Isolated From react-d3-tree Internals"
 * in DECISIONS.md).
 *
 * Geometry notes:
 * - CARD_HALF_H (100) = half the foreignObject height. Links END at the
 *   child's frame top (= card top, cards anchor to the frame top). Links
 *   START at the parent's centre: cards are shorter than the frame and SVG
 *   paints links before nodes, so the stub hides behind the opaque card and
 *   the line emerges at the card's real bottom edge regardless of card
 *   height (badge/pill rows vary it). Rail/curve maths still use the frame
 *   edge (srcY), so the visible shape is unchanged.
 * - Canvas height comes from treeDepth × row height; width is centred once
 *   on mount from the container width.
 * - Known limitation: with many direct reports the S-curves visually cross —
 *   geometric, documented in FEATURES.md; Subtree Focus is the workaround.
 *
 * Debugging: cards clipped → foreignObject width/height vs NodeCard size;
 * connectors detached from cards → CARD_HALF_H no longer matches card height.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react'
import Tree from 'react-d3-tree'
import type { CustomNodeElementProps } from 'react-d3-tree'
import type { OrgNode } from '../../shared/types.js'
import NodeCard from './NodeCard.tsx'
import { treeDepth, findParent } from '../lib/forestNav.ts'
import { toPersonDetail, type PersonDetail } from '../lib/orgPresentation.ts'

export type LinkStyle = 'curve' | 'elbow'

export interface SingleTreeProps {
  root: OrgNode
  initialDepth?: number
  zoom: number
  onSelect?: (p: PersonDetail) => void
  selectedId: string | null
  onSelectId: (id: string | null) => void
  chainIds: Set<string>
  onFocus: (id: string) => void
  panOffset?: { x: number; y: number }
  linkStyle?: LinkStyle
}

export default function SingleTree({
  root, initialDepth, zoom, onSelect, selectedId, onSelectId, chainIds, onFocus, panOffset,
  linkStyle = 'curve',
}: SingleTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [translate, setTranslate] = useState({ x: 0, y: 80 })

  // Centre the tree on the container's midline — and KEEP it centred via
  // ResizeObserver: mobile Safari settles its layout late (URL bar collapse,
  // font load), so a mount-only measurement can centre on a stale width.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const { width } = el.getBoundingClientRect()
      setTranslate((prev) => (prev.x === width / 2 ? prev : { x: width / 2, y: 80 }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const depth = treeDepth(root)
  const height = Math.max(240, depth * 260 + 80)

  // Bezier curves from card-bottom to card-top (y=±100).
  // No horizontal bar artifact: each parent→child gets a smooth S-curve.
  const CARD_HALF_H = 100
  const curveToCardEdge = useCallback(
    (link: { source: { x: number; y: number }; target: { x: number; y: number } }) => {
      const { source: s, target: t } = link
      const upper = s.y <= t.y ? s : t
      const lower = s.y <= t.y ? t : s
      const srcY = upper.y + CARD_HALF_H
      const tgtY = lower.y - CARD_HALF_H
      const midY = (srcY + tgtY) / 2
      // Start at the node CENTRE, not the frame bottom: cards are shorter
      // than the 200px foreignObject and links paint under nodes, so the
      // vertical stub hides behind the card and the line emerges exactly at
      // the card's real bottom edge — no floating gap for short cards.
      return `M${upper.x},${upper.y} L${upper.x},${srcY} C${upper.x},${midY} ${lower.x},${midY} ${lower.x},${tgtY}`
    },
    [],
  )

  // Rounded orthogonal (elbow): drop → horizontal rail at midY → drop, with
  // quadratic corner rounding. Every link from one parent shares the same
  // trunk segment (same x, same midY), so per-link paths overlap
  // pixel-perfectly and read as one bus with branches — sibling S-curves
  // can't cross each other in this style. Same card-edge offsets as the
  // curve, so no line ever touches a card.
  const elbowToCardEdge = useCallback(
    (link: { source: { x: number; y: number }; target: { x: number; y: number } }) => {
      const { source: s, target: t } = link
      const upper = s.y <= t.y ? s : t
      const lower = s.y <= t.y ? t : s
      const srcY = upper.y + CARD_HALF_H
      const tgtY = lower.y - CARD_HALF_H
      const midY = (srcY + tgtY) / 2
      const dx = lower.x - upper.x
      // Same centre-start trick as the curve: the stub down to the frame
      // edge hides behind the parent card.
      if (dx === 0) return `M${upper.x},${upper.y} L${lower.x},${tgtY}`
      const r = Math.min(10, Math.abs(dx) / 2, tgtY - midY)
      const sign = dx > 0 ? 1 : -1
      return [
        `M${upper.x},${upper.y}`,
        `L${upper.x},${midY - r}`,
        `Q${upper.x},${midY} ${upper.x + sign * r},${midY}`,
        `L${lower.x - sign * r},${midY}`,
        `Q${lower.x},${midY} ${lower.x},${midY + r}`,
        `L${lower.x},${tgtY}`,
      ].join(' ')
    },
    [],
  )

  const linkPath = linkStyle === 'elbow' ? elbowToCardEdge : curveToCardEdge

  const renderNode = useCallback(
    ({ nodeDatum, toggleNode }: CustomNodeElementProps) => {
      const nd = nodeDatum as Parameters<typeof NodeCard>[0]['nodeData']
      const id = (nodeDatum.attributes as Record<string, unknown>)?.id as string ?? ''
      // Virtual "Org" root: render-only container — no select/profile/focus.
      const isVirtual = !!(nodeDatum.attributes as Record<string, unknown>)?.isVirtual
      const hasKids = Array.isArray(nd.children) && nd.children.length > 0
      // __rd3t is react-d3-tree's internal state field — read it HERE (the
      // adapter) and pass a plain prop down, so NodeCard stays library-free.
      const collapsed = (nodeDatum as { __rd3t?: { collapsed: boolean } }).__rd3t?.collapsed ?? false
      return (
        <foreignObject width={240} height={200} x={-120} y={-100} style={{ overflow: 'visible' }}>
          <NodeCard
            nodeData={nd}
            collapsed={collapsed}
            selected={!isVirtual && !!id && id === selectedId}
            onChain={!isVirtual && !!id && chainIds.has(id) && id !== selectedId}
            onToggle={toggleNode}
            onFocus={!isVirtual && hasKids && id ? () => onFocus(id) : undefined}
            onClick={isVirtual ? undefined : () => onSelectId(id || null)}
            onProfile={onSelect && !isVirtual ? () => {
              onSelectId(id || null)
              // Parent = manager for the drawer's Manager row (null for roots
              // and under the virtual Org root — findParent skips it).
              onSelect(toPersonDetail(nd, id ? findParent([root], id) : null))
            } : undefined}
          />
        </foreignObject>
      )
    },
    [onSelect, selectedId, onSelectId, chainIds, onFocus, root],
  )

  return (
    <div ref={containerRef} style={{ width: '100%', height }}>
      <Tree
        data={root}
        orientation="vertical"
        pathFunc={linkPath as unknown as 'step'}
        translate={{ x: translate.x + (panOffset?.x ?? 0), y: translate.y }}
        separation={{ siblings: 1.4, nonSiblings: 1.8 }}
        renderCustomNodeElement={renderNode}
        nodeSize={{ x: 280, y: 260 }}
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
