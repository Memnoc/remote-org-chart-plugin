/**
 * CSV builder tests — the escaping rules are the point: a name with a comma,
 * quote, or newline must not shift columns or split rows in Excel. buildCSV
 * is the pure half of the export (exportCSV adds only the Blob + download
 * click on top).
 */
import { describe, it, expect } from 'vitest'
import { buildCSV } from '../src/lib/orgExport.ts'
import type { OrgNode } from '../shared/types.js'

function node(name: string, attrs: Partial<OrgNode['attributes']> = {}, children?: OrgNode[]): OrgNode {
  return { name, attributes: { id: name, ...attrs }, ...(children ? { children } : {}) }
}

describe('buildCSV', () => {
  it('emits header + one depth-first row per person, manager column from the tree', () => {
    const forest = [node('Alice', { title: 'CEO', department: 'Executive' }, [
      node('Bob', { title: 'Eng', department: 'Engineering' }),
    ])]
    const lines = buildCSV(forest).split('\n')
    expect(lines[0]).toBe('Name,Title,Department,Manager,External')
    expect(lines[1]).toBe('"Alice","CEO","Executive","",No')
    expect(lines[2]).toBe('"Bob","Eng","Engineering","Alice",No')
  })

  it('quotes fields containing commas so columns do not shift', () => {
    const csv = buildCSV([node('Smith, Jr.', { title: 'VP, Sales' })])
    expect(csv).toContain('"Smith, Jr.","VP, Sales"')
  })

  it('doubles inner quotes per RFC 4180', () => {
    const csv = buildCSV([node('Al "Big Al" Kowalski')])
    expect(csv).toContain('"Al ""Big Al"" Kowalski"')
  })

  it('strips newlines inside fields so a row never splits', () => {
    const csv = buildCSV([node('line1\nline2', { title: 'a\r\nb' })])
    expect(csv.split('\n')).toHaveLength(2) // header + one row
    expect(csv).toContain('"line1 line2","a b"')
  })

  it('flags external roots in the External column', () => {
    const csv = buildCSV([node('Grace', { isExternal: true })])
    expect(csv.split('\n')[1].endsWith('Yes')).toBe(true)
  })
})
