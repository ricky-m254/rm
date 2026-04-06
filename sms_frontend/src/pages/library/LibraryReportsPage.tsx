import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type CirculationReport = {
  active_borrowings: number
  overdue_count: number
  monthly: Array<{ month: string; total: number; issues: number; returns: number; renewals: number }>
}

type PopularRow = { resource_id: number; title: string; borrow_count: number }
type OverdueRow = {
  transaction_id: number
  member_code: string
  resource_title: string
  copy_accession_number: string
  due_date: string | null
  overdue_days: number
}
type FinesReport = {
  total_fines: string
  total_paid: string
  outstanding: string
  pending_count: number
  breakdown: Array<{ status: string; count: number; amount: string }>
}
type MemberActivityRow = { member_id: number; member_code: string; issues: number; last_issue: string | null }

export default function LibraryReportsPage() {
  const [circulation, setCirculation] = useState<CirculationReport | null>(null)
  const [popular, setPopular] = useState<PopularRow[]>([])
  const [overdue, setOverdue] = useState<OverdueRow[]>([])
  const [fines, setFines] = useState<FinesReport | null>(null)
  const [memberActivity, setMemberActivity] = useState<MemberActivityRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [circulationRes, popularRes, overdueRes, finesRes, memberRes] = await Promise.all([
          apiClient.get<CirculationReport>('/library/reports/circulation/'),
          apiClient.get<PopularRow[]>('/library/reports/popular/'),
          apiClient.get<OverdueRow[]>('/library/reports/overdue/'),
          apiClient.get<FinesReport>('/library/reports/fines/'),
          apiClient.get<MemberActivityRow[]>('/library/reports/member-activity/'),
        ])
        if (!mounted) return
        setCirculation(circulationRes.data)
        setPopular(popularRes.data ?? [])
        setOverdue(overdueRes.data ?? [])
        setFines(finesRes.data)
        setMemberActivity(memberRes.data ?? [])
        setError(null)
      } catch {
        if (!mounted) return
        setError('Library reports are unavailable.')
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHero
        badge="LIBRARY"
        badgeColor="teal"
        title="Library Reports"
        subtitle="Borrowing trends, top books, and usage statistics"
        icon="📚"
      />
      <header className="rounded-2xl glass-panel p-6">
        <h1 className="text-xl font-display font-semibold">Reports & Analytics</h1>
        <p className="mt-2 text-sm text-slate-400">Circulation, overdue, fines, and member activity insights.</p>
        {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Active Borrowings</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{circulation?.active_borrowings ?? 0}</p>
        </article>
        <article className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Overdue Items</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{circulation?.overdue_count ?? 0}</p>
        </article>
        <article className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total Fines</p>
          <p className="mt-2 text-2xl font-semibold text-rose-300">{fines?.total_fines ?? '0.00'}</p>
        </article>
        <article className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Outstanding Fines</p>
          <p className="mt-2 text-2xl font-semibold text-rose-200">{fines?.outstanding ?? '0.00'}</p>
        </article>
      </section>

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Most Borrowed Resources</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Resource</th>
                <th className="px-2 py-2">Borrow Count</th>
              </tr>
            </thead>
            <tbody>
              {popular.map((row) => (
                <tr key={row.resource_id} className="border-t border-white/[0.07]">
                  <td className="px-2 py-2">{row.title}</td>
                  <td className="px-2 py-2">{row.borrow_count}</td>
                </tr>
              ))}
              {!popular.length ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={2}>
                    No borrowing data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Overdue Items</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Member</th>
                <th className="px-2 py-2">Resource</th>
                <th className="px-2 py-2">Copy</th>
                <th className="px-2 py-2">Due Date</th>
                <th className="px-2 py-2">Overdue Days</th>
              </tr>
            </thead>
            <tbody>
              {overdue.map((row) => (
                <tr key={row.transaction_id} className="border-t border-white/[0.07]">
                  <td className="px-2 py-2">{row.member_code}</td>
                  <td className="px-2 py-2">{row.resource_title}</td>
                  <td className="px-2 py-2">{row.copy_accession_number}</td>
                  <td className="px-2 py-2">{row.due_date ?? '-'}</td>
                  <td className="px-2 py-2">{row.overdue_days}</td>
                </tr>
              ))}
              {!overdue.length ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={5}>
                    No overdue items.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Member Activity</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Member</th>
                <th className="px-2 py-2">Issues</th>
                <th className="px-2 py-2">Last Issue</th>
              </tr>
            </thead>
            <tbody>
              {memberActivity.map((row) => (
                <tr key={row.member_id} className="border-t border-white/[0.07]">
                  <td className="px-2 py-2">{row.member_code}</td>
                  <td className="px-2 py-2">{row.issues}</td>
                  <td className="px-2 py-2">{row.last_issue ?? '-'}</td>
                </tr>
              ))}
              {!memberActivity.length ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={3}>
                    No member activity yet.
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
