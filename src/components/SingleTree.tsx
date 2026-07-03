import React, { useRef, useEffect, useState, useCallback } from 'react'
import Tree from 'react-d3-tree'
import type { CustomNodeElementProps } from 'react-d3-tree'
import type { OrgNode } from '../../shared/types.js'
import NodeCard from './NodeCard.tsx'
import { treeDepth } from '../lib/forestNav.ts'
import { toPersonDetail, type PersonDetail } from '../lib/orgPresentation.ts'

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
}

export default function SingleTree({
  root, initialDepth, zoom, onSelect, selectedId, onSelectId, chainIds, onFocus, panOffset,
}: SingleTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [translate, setTranslate] = useState({ x: 0, y: 80 })

  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect()
      setTranslate({ x: width / 2, y: 80 })
    }
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
      return `M${upper.x},${srcY} C${upper.x},${midY} ${lower.x},${midY} ${lower.x},${tgtY}`
    },
    [],
  )

  const renderNode = useCallback(
    ({ nodeDatum, toggleNode }: CustomNodeElementProps) => {
      const nd = nodeDatum as Parameters<typeof NodeCard>[0]['nodeData']
      const id = (nodeDatum.attributes as Record<string, unknown>)?.id as string ?? ''
      const isVirtual = !!(nodeDatum.attributes as Record<string, unknown>)?.isVirtual
      const hasKids = Array.isArray(nd.children) && nd.children.length > 0
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
              onSelect(toPersonDetail(nd))
            } : undefined}
          />
        </foreignObject>
      )
    },
    [onSelect, selectedId, onSelectId, chainIds, onFocus],
  )

  return (
    <div ref={containerRef} style={{ width: '100%', height }}>
      <Tree
        data={root}
        orientation="vertical"
        pathFunc={curveToCardEdge as unknown as 'step'}
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
