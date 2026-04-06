import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Asset = { id: number; name: string; asset_code: string }
type Assignment = {
  id: number; asset: number; asset_name: string; asset_code: string
  assigned_to_name: string; assigned_by_name: string; assigned_date: string
  return_date: string | null; notes: string; status: string
}

export default function AssetsAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [assetId, setAssetId] = useState('')
  const [assignedToName, setAssignedToName] = useState('')
  const [assignedByName, setAssignedByName] = useState('')
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [returnTarget, setReturnTarget] = useState<Assignment | null>(null)
  const [returnedByName, setReturnedByName] = useState('')
  const [returnedByRole, setReturnedByRole] = useState('')
  const [isReturning, setIsReturning] = useState(false)
  const [returnError, setReturnError] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [assignsRes, assetsRes] = await Promise.all([
        apiClient.get<Assignment[]>('/assets/assignments/'),
        apiClient.get<Asset[]>('/assets/'),
      ])
      setAssignments(assignsRes.data)
      setAssets(assetsRes.data.filter(a => !assignsRes.data.some(as => as.asset === a.id && as.status === 'Active')))
    } catch { setError('Unable to load assignments data.') }
    finally { setIsLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!assetId || !assignedToName) return
    setIsProcessing(true)
    try {
      await apiClient.post('/assets/assignments/', { asset: parseInt(assetId), assigned_to_name: assignedToName, assigned_by_name: assignedByName, assigned_date: assignedDate, notes, status: 'Active' })
      setAssetId(''); setAssignedToName(''); setAssignedByName('')
      setAssignedDate(new Date().toISOString().split('T')[0]); setNotes('')
      loadData()
    } catch { setError('Failed to create assignment.') }
    finally { setIsProcessing(false) }
  }

  const openReturn = (row: Assignment) => {
    setReturnTarget(row); setReturnedByName(''); setReturnedByRole(''); setReturnError(null)
  }

  const confirmReturn = async () => {
    if (!returnTarget) return
    setIsReturning(true); setReturnError(null)
    const returnNotes = [returnTarget.notes, returnedByName ? `Returned by: ${returnedByName}` : '', returnedByRole ? `Role/Dept: ${returnedByRole}` : ''].filter(Boolean).join(' | ')
    try {
      await apiClient.patch(`/assets/assignments/${returnTarget.id}/`, { status: 'Returned', return_date: new Date().toISOString().split('T')[0], notes: returnNotes })
      setReturnTarget(null); loadData()
    } catch { setReturnError('Failed to mark as returned.') }
    finally { setIsReturning(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/assets/assignments/${deleteTarget.id}/`); setDeleteTarget(null); loadData() }
    catch { setDeleteError('Failed to delete assignment.') }
    finally { setIsDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ASSETS & MAINTENANCE"
        badgeColor="orange"
        title="Asset Assignments"
        subtitle="Track which staff members are currently responsible for specific assets."
        icon="🏗️"
      />

      <form onSubmit={handleSubmit} className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">New Assignment</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Asset</label>
            <select required className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">Select Asset</option>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.asset_code} - {a.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Assigned To</label>
            <input required placeholder="Staff Name" className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm" value={assignedToName} onChange={(e) => setAssignedToName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Assigned By</label>
            <input required placeholder="Admin Name" className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm" value={assignedByName} onChange={(e) => setAssignedByName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Date</label>
            <input type="date" className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <label className="text-xs text-slate-400">Notes</label>
          <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button type="submit" disabled={isProcessing} className="mt-6 rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-50">
          {isProcessing ? 'Processing...' : 'Assign Asset'}
        </button>
      </form>

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Current & Past Assignments</h2>
        {error ? <p className="mt-4 text-xs text-rose-300">{error}</p> : null}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/[0.07] text-slate-400">
              <tr>
                <th className="px-3 py-3 font-medium">Asset</th>
                <th className="px-3 py-3 font-medium">Assigned To</th>
                <th className="px-3 py-3 font-medium">Assigned By</th>
                <th className="px-3 py-3 font-medium">Dates</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {assignments.map((row) => (
                <tr key={row.id} className="group hover:bg-white/[0.02]">
                  <td className="px-3 py-3"><p className="font-semibold text-slate-200">{row.asset_name}</p><p className="text-xs text-slate-400">{row.asset_code}</p></td>
                  <td className="px-3 py-3 text-slate-300">{row.assigned_to_name}</td>
                  <td className="px-3 py-3 text-slate-300">{row.assigned_by_name}</td>
                  <td className="px-3 py-3"><p className="text-slate-300">{row.assigned_date}</p>{row.return_date && <p className="text-xs text-slate-500">Returned: {row.return_date}</p>}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${row.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>{row.status}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      {row.status === 'Active' && (
                        <button onClick={() => openReturn(row)} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">Return</button>
                      )}
                      <button onClick={() => setDeleteTarget(row)} className="text-xs font-semibold text-rose-400 hover:text-rose-300">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!assignments.length && !isLoading && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No assignment records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {returnTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#0d1421] p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-slate-100">Mark Asset as Returned</h2>
            <p className="mt-1 text-sm text-slate-400">Asset: <strong className="text-slate-200">{returnTarget.asset_name}</strong> · Previously assigned to <strong className="text-slate-200">{returnTarget.assigned_to_name}</strong></p>
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Returned by (name)</label>
                <input value={returnedByName} onChange={e => setReturnedByName(e.target.value)} placeholder="Full name of person returning" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Role / Department</label>
                <input value={returnedByRole} onChange={e => setReturnedByRole(e.target.value)} placeholder="e.g. Head of Department, Finance Clerk" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
              </div>
            </div>
            {returnError ? <p className="mt-3 text-xs text-rose-300">{returnError}</p> : null}
            <div className="mt-5 flex gap-3 justify-end">
              <button onClick={() => setReturnTarget(null)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200">Cancel</button>
              <button onClick={confirmReturn} disabled={isReturning} className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{isReturning ? 'Processing…' : 'Confirm Return'}</button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog open={!!deleteTarget} title="Delete Assignment" description={`Delete this assignment record for ${deleteTarget?.asset_name}?`} confirmLabel="Delete" isProcessing={isDeleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
