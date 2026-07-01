import React, { useRef, useEffect, useState, useCallback } from 'react'
import Tree from 'react-d3-tree'
import type { OrgNode } from '../../shared/types.js'
import NodeCard, { deptColor } from './NodeCard.tsx'

interface Props {
  forest: OrgNode[]
}

function treeDepth(node: OrgNode): number {
  if (!node.children?.length) return 1
  return 1 + Math.max(...node.children.map(treeDepth))
}

function SingleTree({ root }: { root: OrgNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [translate, setTranslate] = useState({ x: 0, y: 80 })

  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect()
      setTranslate({ x: width / 2, y: 80 })
    }
  }, [])

  const depth = treeDepth(root)
  const height = Math.max(220, depth * 180 + 60)

  const renderNode = useCallback(
    ({ nodeDatum, toggleNode }: { nodeDatum: Record<string, unknown>; toggleNode: () => void }) => (
      <foreignObject
        width={230}
        height={110}
        x={-115}
        y={-55}
        onClick={toggleNode}
        style={{ cursor: 'pointer', overflow: 'visible' }}
      >
        <NodeCard nodeData={nodeDatum as Parameters<typeof NodeCard>[0]['nodeData']} />
      </foreignObject>
    ),
    [],
  )

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height,
        background: 'var(--canvas-gradient)',
        borderRadius: 14,
        marginBottom: 20,
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px var(--shadow-primary)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 8, left: 14, fontSize: 11, color: 'var(--text-subtle)', zIndex: 1 }}>
        Tree root: <strong>{root.name}</strong>
      </div>
      <Tree
        data={root}
        orientation="vertical"
        pathFunc="step"
        translate={translate}
        separation={{ siblings: 1.5, nonSiblings: 2 }}
        renderCustomNodeElement={renderNode}
        nodeSize={{ x: 260, y: 180 }}
        zoom={0.8}
        enableLegacyTransitions
        collapsible
      />
    </div>
  )
}

function LoneNodeCard({ node }: { node: OrgNode }) {
  const { name, attributes } = node
  const { title, department, isExternal } = attributes
  const isUnknown = name === '—' && (!title || title === '—')

  return (
    <div style={{
      background: 'var(--card-gradient)',
      border: '1.5px solid var(--border)',
      borderRadius: 10,
      padding: '12px 16px',
      minWidth: 200,
      maxWidth: 280,
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: isUnknown ? 'var(--text-muted)' : 'var(--text)' }}>
        {isUnknown ? 'Unknown Employee' : name}
      </div>
      {title && title !== '—' && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{title}</div>
      )}
      {(() => {
        const deptLabel = (!department || department === '—')
          ? (isExternal ? 'External' : 'Unassigned')
          : department
        const c = deptColor(deptLabel)
        return (
          <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, fontWeight: 600, color: c,
              background: `${c}18`, borderRadius: 20,
              padding: '2px 8px', display: 'inline-block', letterSpacing: '0.02em',
            }}>
              {deptLabel}
            </span>
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
        )
      })()}
    </div>
  )
}

export default function TreeView({ forest }: Props) {
  if (forest.length === 0) {
    return <div style={{ padding: 40, color: 'var(--text-muted)' }}>No org data available.</div>
  }

  const mainTrees = forest.filter((r) => (r.children?.length ?? 0) > 0)
  const loneNodes = forest.filter((r) => !r.children?.length)

  return (
    <div>
      {mainTrees.map((root, i) => (
        <SingleTree key={root.attributes.id ?? i} root={root} />
      ))}
      {loneNodes.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 10, fontWeight: 600 }}>
            No direct reports ({loneNodes.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {loneNodes.map((node, i) => (
              <LoneNodeCard key={node.attributes.id ?? i} node={node} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
