import React from 'react'
import type { OrgNode } from '../../shared/types.js'

interface Props {
  forest: OrgNode[]
}

function NodeRow({ node, depth }: { node: OrgNode; depth: number }) {
  return (
    <div>
      <div style={{
        paddingLeft: depth * 24 + 12,
        paddingTop: 8,
        paddingBottom: 8,
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
      }}>
        <span style={{ fontWeight: depth === 0 ? 700 : 500, fontSize: 13, color: 'var(--text)' }}>
          {depth > 0 && <span style={{ color: 'var(--border)', marginRight: 6 }}>{'└─'}</span>}
          {node.name}
        </span>
        {node.attributes.title && node.attributes.title !== '—' && (
          <span style={{ fontSize: 11, color: 'var(--primary)' }}>{node.attributes.title}</span>
        )}
        {node.attributes.department && node.attributes.department !== '—' && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{node.attributes.department}</span>
        )}
      </div>
      {node.children?.map((child, i) => (
        <NodeRow key={child.attributes.id ?? i} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function ListView({ forest }: Props) {
  if (forest.length === 0) {
    return <div style={{ padding: 40, color: 'var(--text-muted)' }}>No org data available.</div>
  }
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 12,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 1px 4px var(--shadow-primary)',
    }}>
      {forest.map((root, i) => (
        <NodeRow key={root.attributes.id ?? i} node={root} depth={0} />
      ))}
    </div>
  )
}
