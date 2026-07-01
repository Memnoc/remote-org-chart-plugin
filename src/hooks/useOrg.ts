import { useState, useEffect } from 'react'
import type { OrgResponse } from '../../shared/types.js'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: OrgResponse }

export function useOrg(): State {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    fetch('/api/org')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<OrgResponse>
      })
      .then((data) => setState({ status: 'ok', data }))
      .catch((err: Error) => setState({ status: 'error', message: err.message }))
  }, [])

  return state
}
