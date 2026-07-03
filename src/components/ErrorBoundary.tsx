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
