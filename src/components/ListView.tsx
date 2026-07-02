import React, { useState, useEffect } from 'react'
import type { OrgNode } from '../../shared/types.js'
import { isEmpty } from '../lib/orgUtils.ts'

const PAGE_SIZE = 20

interface Props {
  forest: OrgNode[]
  search?: string
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--primary)', color: '#fff', borderRadius: 3, padding: '0 2px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function NodeRow({ node, depth, search }: { node: OrgNode; depth: number; search: string }) {
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
          <Highlight text={node.name} query={search} />
        </span>
        {!isEmpty(node.attributes.title) && (
          <span style={{ fontSize: 11, color: 'var(--primary)' }}>
            <Highlight text={node.attributes.title} query={search} />
          </span>
        )}
        {!isEmpty(node.attributes.department) && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <Highlight text={node.attributes.department} query={search} />
          </span>
        )}
      </div>
      {node.children?.map((child, i) => (
        <NodeRow key={child.attributes.id ?? i} node={child} depth={depth + 1} search={search} />
      ))}
    </div>
  )
}

interface FlatRow { node: OrgNode; depth: number }

function toFlatRows(forest: OrgNode[]): FlatRow[] {
  const rows: FlatRow[] = []
  function walk(node: OrgNode, depth: number) {
    rows.push({ node, depth })
    node.children?.forEach((c) => walk(c, depth + 1))
  }
  forest.forEach((r) => walk(r, 0))
  return rows
}

export default function ListView({ forest, search = '' }: Props) {
  const [page, setPage] = useState(0)

  useEffect(() => { setPage(0) }, [forest, search])

  if (forest.length === 0) {
    return <div style={{ padding: 40, color: 'var(--text-muted)' }}>No org data available.</div>
  }

  const rows = toFlatRows(forest)
  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 1px 4px var(--shadow-primary)',
      }}>
        {pageRows.map(({ node, depth }, i) => (
          <NodeRow key={node.attributes.id ?? `${page}-${i}`} node={node} depth={depth} search={search} />
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, marginTop: 16,
        }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={pageBtn(page === 0)}
          >
            Previous
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={pageBtn(page === totalPages - 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

function pageBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 16px',
    borderRadius: 8,
    border: '1.5px solid var(--border)',
    background: 'var(--surface)',
    color: disabled ? 'var(--text-subtle)' : 'var(--text-muted)',
    fontWeight: 600,
    fontSize: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
}
