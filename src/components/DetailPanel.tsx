import React from 'react'
import { deptColor, initials, isEmpty } from '../lib/orgUtils.ts'

export interface PersonDetail {
  name: string
  title?: string
  department?: string
  isExternal?: boolean
  badge?: string
}

interface Props {
  person: PersonDetail | null
  onClose: () => void
}

function PersonDetailContent({ person, onClose }: { person: PersonDetail; onClose: () => void }) {
  const displayName = isEmpty(person.name) ? 'Unknown Employee' : person.name
  const dept = isEmpty(person.department)
    ? (person.isExternal ? 'External' : 'Unassigned')
    : person.department!
  const color = deptColor(dept)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `${color}18`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 800,
          border: `2px solid ${color}40`,
        }}>
          {displayName === 'Unknown Employee' ? '?' : initials(displayName)}
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 7,
            border: '1.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 16, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>
      </div>

      <div>
        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', lineHeight: 1.2 }}>
          {displayName}
        </div>
        {!isEmpty(person.title) && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {person.title}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Row label="Department">
          <span style={{
            fontSize: 12, fontWeight: 600, color,
            background: `${color}18`, borderRadius: 20,
            padding: '3px 10px',
          }}>{dept}</span>
        </Row>
        <Row label="Employment type">
          <span style={{ fontSize: 13, color: 'var(--text)' }}>
            {person.isExternal ? 'Contractor' : 'Full-time'}
          </span>
        </Row>
        {!isEmpty(person.badge) && (
          <Row label="Badge">
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{person.badge}</span>
          </Row>
        )}
      </div>
    </>
  )
}

export default function DetailPanel({ person, onClose }: Props) {
  React.useEffect(() => {
    if (!person) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [person, onClose])

  return (
    <>
      {person && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.25)' }} />
      )}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: 320,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        transform: person ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        flexDirection: 'column',
        padding: 28,
        gap: 20,
      }}>
        {person && <PersonDetailContent person={person} onClose={onClose} />}
      </div>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {children}
    </div>
  )
}
