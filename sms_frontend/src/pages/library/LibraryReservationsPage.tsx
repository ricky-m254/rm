import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Reservation = {
  id: number
  resource_title: string
  member_member_id: string
  status: string
  queue_position: number
}

export default function LibraryReservationsPage() {
  const [rows, setRows] = useState<Reservation[]>([])
  const [resourceId, setResourceId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const response = await apiClient.get<Reservation[]>('/library/reservations/')
      setRows(response.data ?? [])
      setError(null)
    } catch {
      setError('Reservation API unavailable.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createReservation = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await apiClient.post('/library/reservations/', {
        resource: Number(resourceId),
        member: Number(memberId),
      })
      setResourceId('')
      setMemberId('')
      await load()
    } catch {
      setError('Failed to place reservation.')
    }
  }

  const updateStatus = async (id: number, action: 'cancel' | 'pickup') => {
    try {
      await apiClient.patch(`/library/reservations/${id}/${action}/`)
      await load()
    } catch {
      setError(`Failed to ${action} reservation.`)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="LIBRARY"
        badgeColor="violet"
        title="Reservations & Holds"
        subtitle="Queue management with pickup and cancellation."
        icon="📚"
      />

      <form onSubmit={createReservation} className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Place Reservation</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
            placeholder="Resource ID"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
          />
          <input
            className="rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
            placeholder="Member ID"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          />
          <button type="submit" className="rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200">
            Reserve
          </button>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}
      </form>

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Reservation List</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Resource</th>
                <th className="px-2 py-2">Member</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Queue</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/[0.07]">
                  <td className="px-2 py-2">{row.id}</td>
                  <td className="px-2 py-2">{row.resource_title || '-'}</td>
                  <td className="px-2 py-2">{row.member_member_id || '-'}</td>
                  <td className="px-2 py-2">{row.status}</td>
                  <td className="px-2 py-2">{row.queue_position}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border border-sky-500/60 bg-sky-500/15 px-2 py-1 text-xs text-sky-200"
                        onClick={() => updateStatus(row.id, 'pickup')}
                      >
                        Pick
                      </button>
                      <button
                        className="rounded-lg border border-rose-500/60 bg-rose-500/15 px-2 py-1 text-xs text-rose-200"
                        onClick={() => updateStatus(row.id, 'cancel')}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={6}>
                    No reservations yet.
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
