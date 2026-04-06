import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'

export type AcademicContext = {
  academic_year: { id: number; name: string } | null
  term: { id: number; name: string } | null
}

let _cached: AcademicContext | null = null

export function useCurrentAcademicContext() {
  const [context, setContext] = useState<AcademicContext | null>(_cached)
  const [loading, setLoading] = useState(!_cached)

  useEffect(() => {
    if (_cached) {
      setContext(_cached)
      setLoading(false)
      return
    }
    apiClient
      .get<AcademicContext>('/academics/current/')
      .then((res) => {
        _cached = res.data
        setContext(res.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { context, loading }
}
