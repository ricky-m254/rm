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

type GuardianRow = Guardian & {
  student_names: string[]
  student_ids: number[]
}

export default function ParentsDirectoryPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

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
            setError('Unable to load parent directory. Please try again.')
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

  const directory = useMemo<GuardianRow[]>(() => {
    const map = new Map<number, GuardianRow>()
    students.forEach((student) => {
      const studentName = `${student.first_name} ${student.last_name}`.trim()
      student.guardians?.forEach((guardian) => {
        const existing = map.get(guardian.id)
        if (existing) {
          existing.student_names.push(studentName)
          existing.student_ids.push(student.id)
        } else {
          map.set(guardian.id, {
            ...guardian,
            student_names: [studentName],
            student_ids: [student.id],
          })
        }
      })
    })
    return Array.from(map.values())
  }, [students])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return directory
    return directory.filter((guardian) => {
      const haystack = [
        guardian.name,
        guardian.relationship,
        guardian.phone,
        guardian.email,
        guardian.student_names.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [directory, query])

  return (
    <div className="space-y-8">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Guardians"
        subtitle="Parent and guardian contacts linked to student records."
        icon="📋"
      />

      {isLoading ? (
        <div className="rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading directory...</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}

      <section className="rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Guardian list</h2>
            <p className="mt-1 text-sm text-slate-400">Derived from `/api/students/`.</p>
          </div>
          <input
            className="w-full max-w-xs rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
            placeholder="Search name, contact, student"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Relationship</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((guardian) => (
                <tr key={guardian.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">{guardian.name}</td>
                  <td className="px-4 py-3">{guardian.relationship ?? '--'}</td>
                  <td className="px-4 py-3">{guardian.phone ?? '--'}</td>
                  <td className="px-4 py-3">{guardian.email ?? '--'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {guardian.student_names.map((studentName, index) => (
                        <span
                          key={`${guardian.id}-${index}`}
                          className="rounded-full border border-white/[0.09] px-2 py-1 text-xs text-slate-200"
                        >
                          {studentName}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                    No guardians found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
