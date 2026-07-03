/**
 * ListView — flat alternative to the tree canvas. Rows come from
 * walkForest() in depth-first order (a parent always directly precedes its
 * reports); indentation depth conveys hierarchy, `└─` marks non-roots.
 * Search-match substrings are highlighted; App has already PRUNED the forest
 * to matches — the highlight here is cosmetic on what survived.
 *
 * Pagination over virtualisation on purpose: simpler, and fine at org scale
 * (see "Pagination Over Virtualisation" in DECISIONS.md).
 */
import React, { useState } from 'react'
import type { OrgNode } from '../../shared/types.js'
import { walkForest } from '../lib/forestNav.ts'

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
        // Filter-context ancestor (see forestFilter.ts) — dimmed, same as tree
        opacity: node.attributes.isContext ? 0.45 : 1,
      }}>
        <span style={{ fontWeight: depth === 0 ? 700 : 500, fontSize: 13, color: 'var(--text)' }}>
          {depth > 0 && <span style={{ color: 'var(--border)', marginRight: 6 }}>{'└─'}</span>}
          <Highlight text={node.name} query={search} />
        </span>
        {node.attributes.title && (
          <span style={{ fontSize: 11, color: 'var(--primary)' }}>
            <Highlight text={node.attributes.title} query={search} />
          </span>
        )}
        {node.attributes.department && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <Highlight text={node.attributes.department} query={search} />
          </span>
        )}
      </div>
    </div>
  )
}

export default function ListView({ forest, search = '' }: Props) {
  const [page, setPage] = useState(0)

  // Reset pagination when the data or query changes — adjusted during render
  // (not in an effect) so the new data never flashes at a stale page index.
  // (react.dev/learn/you-might-not-need-an-effect — "Adjusting state when a prop changes")
  const [prevInputs, setPrevInputs] = useState({ forest, search })
  if (prevInputs.forest !== forest || prevInputs.search !== search) {
    setPrevInputs({ forest, search })
    setPage(0)
  }

  if (forest.length === 0) {
    return <div style={{ padding: 40, color: 'var(--text-muted)' }}>No org data available.</div>
  }

  const rows = walkForest(forest)
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
