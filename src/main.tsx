/**
 * Entry point. The ErrorBoundary here is the OUTERMOST of four rings —
 * last resort with no recovery action beyond Retry. The inner rings (App
 * content, per-tree, per-list) catch first and offer better recovery
 * (see "Error Boundary Strategy: Four-Layer Isolation" in DECISIONS.md).
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
