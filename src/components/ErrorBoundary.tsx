/**
 * ErrorBoundary — used at four nesting levels so a render crash degrades to
 * the smallest possible region (see "Error Boundary Strategy" in
 * DECISIONS.md):
 *   1. main.tsx (root, last resort)
 *   2. App content — gets onRefresh
 *   3. each SingleTree in TreeView
 *   4. ListView wrapper
 *
 * Two recovery buttons: "Retry" just clears the error and re-renders — if
 * the crash came from bad DATA that loops forever, which is why the App-level
 * boundary passes onRefresh ("Refresh data") to re-fetch instead.
 *
 * Limits worth knowing: boundaries only catch RENDER-phase errors — not
 * event handlers (use try/catch, e.g. the CSV export in App), not async
 * code. Class component because getDerivedStateFromError has no hook
 * equivalent. componentDidCatch is the ready hook for an error-telemetry
 * SDK if one is ever added (see "No Error Telemetry" ADR).
 */
import React from 'react'

interface Props extends React.PropsWithChildren { onRefresh?: () => void }
interface State { error: Error | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      const { onRefresh } = this.props
      return (
        <div style={{
          margin: '60px auto',
          maxWidth: 480,
          padding: 28,
          borderRadius: 14,
          border: '1px solid var(--primary-mid)',
          background: 'var(--primary-light)',
          color: 'var(--text)',
          fontFamily: 'inherit',
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--danger)' }}>
            Something went wrong
          </div>
          <pre style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
          }}>
            {this.state.error.message}
          </pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {onRefresh && (
              <button
                onClick={() => { this.setState({ error: null }); onRefresh() }}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: 'var(--primary)', color: '#fff',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                Refresh data
              </button>
            )}
            <button
              onClick={() => this.setState({ error: null })}
              style={{
                padding: '7px 16px', borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
