import React, { useRef, useEffect, useState, useCallback } from 'react'
import Tree from 'react-d3-tree'
import type { CustomNodeElementProps } from 'react-d3-tree'
import type { OrgNode } from '../../shared/types.js'
import NodeCard from './NodeCard.tsx'
import { treeDepth, toPersonDetail, type PersonDetail } from '../lib/orgUtils.ts'

export interface SingleTreeProps {
  root: OrgNode
  initialDepth?: number
  zoom: number
  onSelect?: (p: PersonDetail) => void
  selectedId: string | null
  onSelectId: (id: string | null) => void
  chainIds: Set<string>
  onFocus: (id: string) => void
}

export default function SingleTree({
  root, initialDepth, zoom, onSelect, selectedId, onSelectId, chainIds, onFocus,
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

  // Draw step paths that terminate at card edges (y=±100) instead of node centers.
  // Keeps the entire drawn path in the inter-card gap → consistent visible weight.
  const CARD_HALF_H = 100
  const stepToCardEdge = useCallback(
    (link: { source: { x: number; y: number }; target: { x: number; y: number } }) => {
      const { source: s, target: t } = link
      const srcY = s.y + CARD_HALF_H
      const tgtY = t.y - CARD_HALF_H
      const midY = (srcY + tgtY) / 2
      return `M${s.x},${srcY} L${s.x},${midY} L${t.x},${midY} L${t.x},${tgtY}`
    },
    [],
  )

  const renderNode = useCallback(
    ({ nodeDatum, toggleNode }: CustomNodeElementProps) => {
      const nd = nodeDatum as Parameters<typeof NodeCard>[0]['nodeData']
      const id = (nodeDatum.attributes as Record<string, unknown>)?.id as string ?? ''
      const hasKids = Array.isArray(nd.children) && nd.children.length > 0
      return (
        <foreignObject width={240} height={200} x={-120} y={-100} style={{ overflow: 'visible' }}>
          <NodeCard
            nodeData={nd}
            selected={!!id && id === selectedId}
            onChain={!!id && chainIds.has(id) && id !== selectedId}
            onToggle={toggleNode}
            onFocus={hasKids && id ? () => onFocus(id) : undefined}
            onClick={() => onSelectId(id || null)}
            onProfile={onSelect ? () => {
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
        pathFunc={stepToCardEdge as unknown as 'step'}
        translate={translate}
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
