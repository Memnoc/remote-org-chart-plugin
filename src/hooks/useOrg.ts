import { useState, useEffect, useCallback } from 'react'
import type { OrgResponse } from '../../shared/types.js'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: OrgResponse }

export function useOrg(): State & { refresh: () => void; refreshing: boolean } {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [tick, setTick] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (tick === 0) setState({ status: 'loading' })
    else setRefreshing(true)
    fetch('/api/org', { signal: AbortSignal.timeout(120_000) })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<OrgResponse>
      })
      .then((data) => { setState({ status: 'ok', data }); setRefreshing(false) })
      .catch((err: Error) => { setState({ status: 'error', message: err.message }); setRefreshing(false) })
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
