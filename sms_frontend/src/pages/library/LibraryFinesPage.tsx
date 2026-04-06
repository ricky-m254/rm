import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Fine = {
  id: number
  member_member_id: string
  fine_type: string
  amount: string
  amount_paid: string
  status: string
}

type FinePosting = {
  id: number
  entry_date: string
  memo: string
  source_type: string
  entry_key: string
  lines: Array<{
    account_code: string
    account_name: string
    debit: string
    credit: string
    description: string
  }>
}

export default function LibraryFinesPage() {
  const [rows, setRows] = useState<Fine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedFineId, setSelectedFineId] = useState<number | null>(null)
  const [postings, setPostings] = useState<FinePosting[]>([])

  const load = async () => {
    try {
      const response = await apiClient.get<Fine[]>('/library/fines/')
      setRows(response.data ?? [])
      setError(null)
    } catch {
      setError('Fines API unavailable.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const pay = async (id: number) => {
    try {
      await apiClient.post(`/library/fines/${id}/pay/`, {})
      await load()
    } catch {
      setError('Fine payment failed.')
    }
  }

  const waive = async (id: number) => {
    try {
      await apiClient.post(`/library/fines/${id}/waive/`, { reason: 'Approved waiver' })
      await load()
    } catch {
      setError('Fine waiver failed.')
    }
  }

  const loadPostings = async (id: number) => {
    try {
      const response = await apiClient.get<FinePosting[]>(`/library/fines/${id}/finance-postings/`)
      setSelectedFineId(id)
      setPostings(response.data ?? [])
      setError(null)
    } catch {
      setError('Unable to load finance postings for this fine.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="LIBRARY"
        badgeColor="teal"
        title="Fines & Penalties"
        subtitle="Track outstanding fines and payments"
        icon="📚"
      />
      <header className="rounded-2xl glass-panel p-6">
        <h1 className="text-xl font-display font-semibold">Fines & Fees</h1>
        <p className="mt-2 text-sm text-slate-400">Track overdue and penalty balances.</p>
        {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}
      </header>

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Fine List</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Member</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Paid</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/[0.07]">
                  <td className="px-2 py-2">{row.member_member_id || '-'}</td>
                  <td className="px-2 py-2">{row.fine_type}</td>
                  <td className="px-2 py-2">{row.amount}</td>
                  <td className="px-2 py-2">{row.amount_paid}</td>
                  <td className="px-2 py-2">{row.status}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border border-sky-500/60 bg-sky-500/15 px-2 py-1 text-xs text-sky-200"
                        onClick={() => pay(row.id)}
                      >
                        Pay
                      </button>
                      <button
                        className="rounded-lg border border-amber-500/60 bg-amber-500/15 px-2 py-1 text-xs text-amber-200"
                        onClick={() => waive(row.id)}
                      >
                        Waive
                      </button>
                      <button
                        className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-200"
                        onClick={() => loadPostings(row.id)}
                      >
                        Finance
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={6}>
                    No fines yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selectedFineId ? (
        <section className="rounded-2xl glass-panel p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">Finance Postings for Fine #{selectedFineId}</h2>
            <button
              className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs text-slate-300"
              onClick={() => {
                setSelectedFineId(null)
                setPostings([])
              }}
            >
              Close
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Memo</th>
                  <th className="px-2 py-2">Lines</th>
                </tr>
              </thead>
              <tbody>
                {postings.map((entry) => (
                  <tr key={entry.id} className="border-t border-white/[0.07] align-top">
                    <td className="px-2 py-2">{entry.entry_date}</td>
                    <td className="px-2 py-2">{entry.source_type}</td>
                    <td className="px-2 py-2">{entry.memo}</td>
                    <td className="px-2 py-2">
                      <div className="space-y-1">
                        {entry.lines.map((line, index) => (
                          <div key={`${entry.id}-${line.account_code}-${index}`} className="text-xs text-slate-300">
                            {line.account_code} {line.account_name} | D {line.debit} C {line.credit}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {!postings.length ? (
                  <tr>
                    <td className="px-2 py-4 text-slate-500" colSpan={4}>
                      No finance postings recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
