import type { OrgNode } from '../../shared/types.js'

function flattenForest(forest: OrgNode[], parentName = ''): string[][] {
  const rows: string[][] = []
  for (const node of forest) {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
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
  URL.revokeObjectURL(url)
}
