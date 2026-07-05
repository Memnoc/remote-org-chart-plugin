/**
 * DetailPanel — right-hand slide-in drawer for the selected person. Always
 * mounted; visibility is a CSS transform (translateX) so open/close animates.
 * Closes on ×, backdrop click, or Esc — the Esc listener attaches only while
 * open, and App's own Esc handler backs off while a person is selected so
 * the two don't fight.
 */
import React from 'react'
import { deptColor, initials, type PersonDetail } from '../lib/orgPresentation.ts'

export type { PersonDetail }

interface Props {
  person: PersonDetail | null
  onClose: () => void
}

function PersonDetailContent({ person, onClose }: { person: PersonDetail; onClose: () => void }) {
  const displayName = person.name || 'Unknown Employee'
  const dept = person.department ?? (person.isExternal ? 'External' : 'Unassigned')
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
        {person.title && (
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
        {person.manager && (
          <Row label="Manager">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: `${deptColor(person.manager.department)}18`,
                color: deptColor(person.manager.department),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                border: `1.5px solid ${deptColor(person.manager.department)}35`,
              }}>
                {initials(person.manager.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.25 }}>
                  {person.manager.name}
                </div>
                {person.manager.title && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>
                    {person.manager.title}
                  </div>
                )}
              </div>
            </div>
          </Row>
        )}
        {person.reports && person.reports.length > 0 && (
          <Row label={`Direct reports (${person.reports.length})`}>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
              {person.reports.slice(0, 6).map((r, i) => {
                const c = deptColor(r.department)
                return (
                  <div key={i} title={r.name} style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    // Tint layered over the solid surface so overlapped
                    // avatars don't show through each other.
                    background: `linear-gradient(${c}18, ${c}18), var(--surface)`,
                    color: c,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    boxShadow: '0 0 0 2px var(--surface)',
                    border: `1.5px solid ${c}35`,
                    marginLeft: i === 0 ? 0 : -8,
                  }}>
                    {r.name ? initials(r.name) : '?'}
                  </div>
                )
              })}
              {person.reports.length > 6 && (
                <div title={person.reports.slice(6).map((r) => r.name || 'Unknown').join(', ')} style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--border-subtle)', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  boxShadow: '0 0 0 2px var(--surface)',
                  border: '1.5px solid var(--border)',
                  marginLeft: -8,
                }}>
                  +{person.reports.length - 6}
                </div>
              )}
            </div>
          </Row>
        )}
        {person.badge && (
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
        // Caps at 88vw on phones; identical 320px on anything wider.
        width: 'min(320px, 88vw)',
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
