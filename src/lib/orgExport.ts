/**
 * CSV export — fully client-side, no server round-trip. Walks the UNFILTERED
 * forest depth-first (parent always precedes its reports), builds a Blob and
 * clicks a synthetic <a download>. Called from the Toolbar via App, wrapped
 * in try/catch there because a synthetic-event throw would bypass the
 * ErrorBoundary.
 */
import type { OrgNode } from '../../shared/types.js'

// CSV escaping: wrap in quotes, double inner quotes, strip newlines so
// Excel doesn't split a field value across rows.
const esc = (v: string) => `"${v.replace(/[\r\n]+/g, ' ').replace(/"/g, '""')}"`

function flattenForest(forest: OrgNode[], parentName = ''): string[][] {
  const rows: string[][] = []
  for (const node of forest) {
    rows.push([esc(node.name), esc(node.attributes.title ?? ''), esc(node.attributes.department ?? ''), esc(parentName), node.attributes.isExternal ? 'Yes' : 'No'])
    rows.push(...flattenForest(node.children ?? [], node.name))
  }
  return rows
}

export function exportCSV(forest: OrgNode[]) {
  const header = ['Name', 'Title', 'Department', 'Manager', 'External']
  const csv = [header, ...flattenForest(forest)].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'org-chart.csv'; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
