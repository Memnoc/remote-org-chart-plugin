/**
 * useOrg — the app's single data source. Fetches GET /api/org once on mount
 * and again whenever `tick` bumps; everything the UI shows derives from the
 * OrgResponse held here.
 *
 * Refresh flow (the Header button): refresh() POSTs /api/org/refresh (busts
 * the server's 5-min cache), then bumps `tick` to re-run the fetch effect.
 * While a refresh is in flight the OLD data stays on screen (`refreshing`
 * drives the spinner) — only the initial load shows the loading state.
 *
 * Timeouts: 120 s on the GET because a cold live fetch of a large org is
 * legitimately slow (N+1 detail fetch server-side); 10 s on the refresh POST
 * because it's a trivial cache clear.
 *
 * Debugging: app stuck on "Loading org data…" → check the Network tab for
 * /api/org, then the server logs ([org]/[remote] prefixes).
 */
import { useState, useEffect, useCallback } from 'react'
import type { OrgResponse } from '../../shared/types.js'

// Discriminated union — components switch on `status`, so TypeScript forces
// handling of loading/error/ok everywhere the data is consumed.
type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: OrgResponse }

export function useOrg(): State & { refresh: () => void; refreshing: boolean } {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [tick, setTick] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    // Stale-response guard: a refresh mid-flight re-runs this effect; without
    // the flag the older fetch could resolve last and overwrite newer data.
    // (react.dev/learn/you-might-not-need-an-effect — "Fetching data")
    // No setState at effect start on purpose: initial state is already
    // 'loading', and refresh() sets `refreshing` before bumping tick.
    let ignore = false
    fetch('/api/org', { signal: AbortSignal.timeout(120_000) })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<OrgResponse>
      })
      .then((data) => {
        if (ignore) return
        setState({ status: 'ok', data })
        setRefreshing(false)
      })
      .catch((err: Error) => {
        if (ignore) return
        setState({ status: 'error', message: err.message })
        setRefreshing(false)
      })
    return () => { ignore = true }
  }, [tick])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetch('/api/org/refresh', { method: 'POST', signal: AbortSignal.timeout(10_000) })
      setTick((t) => t + 1)
    } catch {
      setRefreshing(false)
    }
  }, [])

  return { ...state, refresh, refreshing }
}
