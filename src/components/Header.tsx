/**
 * Header — top bar: brand, build SHA, data-source status, theme picker,
 * docs link. The status cluster is the ops surface of the app:
 *   green dot  = live Remote API data
 *   amber dot  = snapshot fallback (no token, or the live fetch failed)
 *   "N skipped" amber badge = employees the server couldn't fetch
 *                             (OrgResponse.skippedCount — see remoteClient)
 *   Refresh    = busts the server cache, then refetches (useOrg.refresh)
 * The build SHA (__GIT_SHA__, injected by vite.config define) answers
 * "which commit is actually deployed?" at a glance.
 */
import React from 'react'
import type { ThemeMode } from '../hooks/useTheme.ts'
import { useDropdown } from '../hooks/useDropdown.ts'
import { useIsNarrow } from '../hooks/useIsNarrow.ts'
import { RefreshIcon, SunIcon, MoonIcon, SystemIcon, GitCommitIcon, iconBtnStyle } from './icons.tsx'

const THEME_LABELS: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' }

interface Props {
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  status: 'loading' | 'ok' | 'error'
  source?: 'live' | 'snapshot'
  fetchedAt?: string
  skippedCount?: number
  onRefresh: () => void
  refreshing: boolean
}

export default function Header({ theme, setTheme, status, source, fetchedAt, skippedCount, onRefresh, refreshing }: Props) {
  const { open, setOpen, triggerRef: btnRef, panelRef } = useDropdown()
  const narrow = useIsNarrow()

  const isLive = status === 'ok' && source === 'live'

  return (
    <div style={{
      height: 52,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: narrow ? '0 12px' : '0 20px',
      gap: narrow ? 8 : 12,
      flexShrink: 0,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      zIndex: 30,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #5b21b6, #c4a7e7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(91,33,182,0.35)',
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="3" r="2" fill="white" />
            <circle cx="3" cy="12" r="2" fill="white" />
            <circle cx="13" cy="12" r="2" fill="white" />
            <line x1="8" y1="5" x2="3" y2="10" stroke="white" strokeWidth="1.2" />
            <line x1="8" y1="5" x2="13" y2="10" stroke="white" strokeWidth="1.2" />
          </svg>
        </div>
        <span style={{ fontWeight: 800, fontSize: narrow ? 15 : 17, color: 'var(--text)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
          Org Chart Plugin
        </span>
      </div>

      {/* Build SHA is a dev/ops detail — not worth phone-width pixels */}
      {!narrow && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#d97706', userSelect: 'all' }} title="Build SHA">
          <GitCommitIcon />
          <span style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.04em', opacity: 0.75 }}>
            {__GIT_SHA__}
          </span>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {status === 'ok' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isLive ? 'var(--success)' : 'var(--warning)',
          }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            {isLive ? 'Live' : 'Snapshot'}
          </span>
          {fetchedAt && !narrow && (
            <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
              · {new Date(fetchedAt).toLocaleTimeString()}
            </span>
          )}
          <button onClick={onRefresh} disabled={refreshing} title="Refresh" style={iconBtnStyle}>
            <RefreshIcon spinning={refreshing} />
          </button>
          {skippedCount !== undefined && skippedCount > 0 && (
            <span
              title={`${skippedCount} employee${skippedCount === 1 ? '' : 's'} could not be loaded from the Remote API and are missing from this chart.`}
              style={{
                fontSize: 11, fontWeight: 600, color: '#92400e',
                background: '#fef3c7', border: '1px solid #fde68a',
                borderRadius: 10, padding: '2px 8px', cursor: 'default',
              }}
            >
              {skippedCount} skipped
            </span>
          )}
        </div>
      )}

      <a
        href="https://memnoc.github.io/remote-org-chart-plugin/"
        target="_blank"
        rel="noopener noreferrer"
        title="Documentation"
        style={{
          fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
          textDecoration: 'none', padding: '5px 10px', borderRadius: 7,
          border: '1px solid var(--border)',
        }}
      >
        Docs
      </a>

      <div style={{ position: 'relative' }}>
        <button ref={btnRef} onClick={() => setOpen((o) => !o)} title="Theme" style={iconBtnStyle}>
          {theme === 'dark' ? <MoonIcon /> : theme === 'light' ? <SunIcon /> : <SystemIcon />}
        </button>
        {open && (
          <div ref={panelRef} style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '6px', zIndex: 100, minWidth: 130,
          }}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
              <button key={m} onClick={() => { setTheme(m); setOpen(false) }} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 10px', border: 'none', borderRadius: 7,
                background: theme === m ? 'var(--border-subtle)' : 'transparent',
                color: theme === m ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: theme === m ? 600 : 400, fontSize: 13, cursor: 'pointer', textAlign: 'left',
              }}>
                {m === 'light' ? <SunIcon /> : m === 'dark' ? <MoonIcon /> : <SystemIcon />}
                {THEME_LABELS[m]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
