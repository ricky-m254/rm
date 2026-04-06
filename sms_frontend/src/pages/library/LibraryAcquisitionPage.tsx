import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type AcquisitionRequest = {
  id: number
  title: string
  author: string
  isbn: string
  quantity: number
  estimated_cost: string | null
  status: string
  justification: string
  requested_by_name?: string
  approved_by_name?: string
}

export default function LibraryAcquisitionPage() {
  const [rows, setRows] = useState<AcquisitionRequest[]>([])
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [justification, setJustification] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const response = await apiClient.get<AcquisitionRequest[]>('/library/acquisition/requests/')
      setRows(response.data ?? [])
      setError(null)
    } catch {
      setError('Acquisition API unavailable.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const createRequest = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    try {
      await apiClient.post('/library/acquisition/requests/', {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        quantity: Number(quantity || 1),
        estimated_cost: estimatedCost.trim() || null,
        justification: justification.trim(),
      })
      setTitle('')
      setAuthor('')
      setIsbn('')
      setQuantity('1')
      setEstimatedCost('')
      setJustification('')
      await load()
    } catch {
      setError('Unable to create acquisition request.')
    }
  }

  const advance = async (id: number, action: 'approve' | 'reject' | 'mark-ordered' | 'mark-received') => {
    try {
      await apiClient.post(`/library/acquisition/requests/${id}/${action}/`, {})
      await load()
    } catch {
      setError('Unable to update request status.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="LIBRARY"
        badgeColor="violet"
        title="Acquisition Requests"
        subtitle="Track purchase requests through approval and receiving."
        icon="📚"
      />

      <form onSubmit={createRequest} className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">New Request</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
            placeholder="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <input
            className="rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
            placeholder="ISBN"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
          <input
            type="number"
            min={1}
            className="rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <input
            className="rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
            placeholder="Estimated cost"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200"
          >
            Create Request
          </button>
        </div>
        <textarea
          className="mt-3 w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
          placeholder="Justification"
          rows={3}
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
        />
        {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}
      </form>

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Request List</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">Qty</th>
                <th className="px-2 py-2">Estimated Cost</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Requested By</th>
                <th className="px-2 py-2">Approved By</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/[0.07]">
                  <td className="px-2 py-2">{row.title}</td>
                  <td className="px-2 py-2">{row.quantity}</td>
                  <td className="px-2 py-2">{row.estimated_cost ?? '-'}</td>
                  <td className="px-2 py-2">{row.status}</td>
                  <td className="px-2 py-2">{row.requested_by_name ?? '-'}</td>
                  <td className="px-2 py-2">{row.approved_by_name ?? '-'}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {row.status === 'Pending' ? (
                        <>
                          <button
                            className="rounded-lg border border-emerald-500/60 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200"
                            onClick={() => advance(row.id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="rounded-lg border border-rose-500/60 bg-rose-500/15 px-2 py-1 text-xs text-rose-200"
                            onClick={() => advance(row.id, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {row.status === 'Approved' ? (
                        <button
                          className="rounded-lg border border-sky-500/60 bg-sky-500/15 px-2 py-1 text-xs text-sky-200"
                          onClick={() => advance(row.id, 'mark-ordered')}
                        >
                          Mark Ordered
                        </button>
                      ) : null}
                      {row.status === 'Ordered' ? (
                        <button
                          className="rounded-lg border border-violet-500/60 bg-violet-500/15 px-2 py-1 text-xs text-violet-200"
                          onClick={() => advance(row.id, 'mark-received')}
                        >
                          Mark Received
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={7}>
                    No requests yet.
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
