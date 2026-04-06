import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Guardian = {
  id: number
  name: string
  relationship?: string
  phone?: string
  email?: string
  is_active?: boolean
}

type Student = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
  guardians?: Guardian[]
}

export default function ParentsSummaryPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const response = await apiClient.get<Student[]>('/students/')
        if (isMounted) {
          setStudents(response.data)
        }
      } catch (err) {
        if (isMounted) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            setError('Session expired. Please log in again.')
          } else if (status === 403) {
            setError('Access denied. Ensure this user has the PARENTS module and proper role.')
          } else if (status === 404) {
            setError('Parents endpoints not found (404). Verify tenant routing.')
          } else {
            setError('Unable to load parent data. Please try again.')
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  const guardians = useMemo(() => {
    const map = new Map<number, Guardian>()
    students.forEach((student) => {
      student.guardians?.forEach((guardian) => {
        if (!map.has(guardian.id)) {
          map.set(guardian.id, guardian)
        }
      })
    })
    return Array.from(map.values())
  }, [students])

  const primaryContacts = useMemo(() => {
    return guardians.filter((guardian) => guardian.relationship?.toLowerCase() === 'parent')
  }, [guardians])

  return (
    <div className="space-y-8">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Family Overview"
        subtitle="Summary view of guardian records linked to students."
        icon="📋"
      />

      {isLoading ? (
        <div className="rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading parents data...</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-2xl glass-panel p-6 md:col-span-6 lg:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Guardians</p>
          <p className="mt-3 text-2xl font-display font-semibold">{guardians.length}</p>
        </div>
        <div className="col-span-12 rounded-2xl glass-panel p-6 md:col-span-6 lg:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Primary contacts</p>
          <p className="mt-3 text-2xl font-display font-semibold">{primaryContacts.length}</p>
        </div>
        <div className="col-span-12 rounded-2xl glass-panel p-6 md:col-span-6 lg:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Students</p>
          <p className="mt-3 text-2xl font-display font-semibold">{students.length}</p>
        </div>
        <div className="col-span-12 rounded-2xl border border-emerald-500/40 glass-panel p-6 md:col-span-6 lg:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reachable</p>
          <p className="mt-3 text-2xl font-display font-semibold">
            {guardians.filter((guardian) => guardian.phone || guardian.email).length}
          </p>
        </div>
      </section>
    </div>
  )
}
