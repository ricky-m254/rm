import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type InventoryAudit = {
  id: number
  audit_date: string
  total_expected: number
  total_found: number
  missing_count: number
  status: string
  notes: string
  conducted_by_name?: string
}

export default function LibraryInventoryPage() {
  const [rows, setRows] = useState<InventoryAudit[]>([])
  const [totalFound, setTotalFound] = useState('0')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const response = await apiClient.get<InventoryAudit[]>('/library/inventory/audits/')
      setRows(response.data ?? [])
      setError(null)
    } catch {
      setError('Inventory API unavailable.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const createAudit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await apiClient.post('/library/inventory/audits/', {
        total_found: Number(totalFound || 0),
        notes: notes.trim(),
      })
      setTotalFound('0')
      setNotes('')
      await load()
    } catch {
      setError('Unable to create inventory audit.')
    }
  }

  const completeAudit = async (id: number, found: number) => {
    try {
      await apiClient.post(`/library/inventory/audits/${id}/complete/`, {
        total_found: found,
      })
      await load()
    } catch {
      setError('Unable to complete inventory audit.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="LIBRARY"
        badgeColor="violet"
        title="Inventory Audits"
        subtitle="Run stock audits and track found vs missing copies."
        icon="📚"
      />

      <form onSubmit={createAudit} className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Start Audit</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            type="number"
            min={0}
            className="rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
            placeholder="Total found"
            value={totalFound}
            onChange={(e) => setTotalFound(e.target.value)}
          />
          <input
            className="rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200"
          >
            Create Audit
          </button>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}
      </form>

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Audit History</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Expected</th>
                <th className="px-2 py-2">Found</th>
                <th className="px-2 py-2">Missing</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">By</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/[0.07]">
                  <td className="px-2 py-2">{row.audit_date}</td>
                  <td className="px-2 py-2">{row.total_expected}</td>
                  <td className="px-2 py-2">{row.total_found}</td>
                  <td className="px-2 py-2">{row.missing_count}</td>
                  <td className="px-2 py-2">{row.status}</td>
                  <td className="px-2 py-2">{row.conducted_by_name ?? '-'}</td>
                  <td className="px-2 py-2">
                    {row.status === 'In Progress' ? (
                      <button
                        className="rounded-lg border border-sky-500/60 bg-sky-500/15 px-2 py-1 text-xs text-sky-200"
                        onClick={() => completeAudit(row.id, row.total_found)}
                      >
                        Complete
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">Done</span>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={7}>
                    No audits yet.
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
