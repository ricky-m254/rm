import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Asset = {
  id: number
  name: string
  asset_code: string
}

type Maintenance = {
  id: number
  asset: number
  asset_name: string
  asset_code: string
  maintenance_type: string
  description: string
  scheduled_date: string
  completed_date: string | null
  cost: string | null
  technician_name: string
  status: string
  notes: string
}

export default function AssetsMaintenancePage() {
  const [records, setRecords] = useState<Maintenance[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [assetId, setAssetId] = useState('')
  const [maintenanceType, setMaintenanceType] = useState('Preventive')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0])
  const [completedDate, setCompletedDate] = useState('')
  const [cost, setCost] = useState('')
  const [technicianName, setTechnicianName] = useState('')
  const [status, setStatus] = useState('Pending')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Maintenance | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [recordsRes, assetsRes] = await Promise.all([
        apiClient.get<Maintenance[]>('/assets/maintenance/'),
        apiClient.get<Asset[]>('/assets/'),
      ])
      setRecords(recordsRes.data)
      setAssets(assetsRes.data)
    } catch {
      setError('Unable to load maintenance data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setAssetId('')
    setMaintenanceType('Preventive')
    setDescription('')
    setScheduledDate(new Date().toISOString().split('T')[0])
    setCompletedDate('')
    setCost('')
    setTechnicianName('')
    setStatus('Pending')
    setNotes('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!assetId || !description || !technicianName) return
    setIsProcessing(true)
    const payload = {
      asset: parseInt(assetId),
      maintenance_type: maintenanceType,
      description,
      scheduled_date: scheduledDate,
      completed_date: completedDate || null,
      cost: cost || null,
      technician_name: technicianName,
      status,
      notes,
    }

    try {
      if (editingId) {
        await apiClient.put(`/assets/maintenance/${editingId}/`, payload)
      } else {
        await apiClient.post('/assets/maintenance/', payload)
      }
      resetForm()
      loadData()
    } catch {
      setError('Failed to save maintenance record.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEdit = (rec: Maintenance) => {
    setEditingId(rec.id)
    setAssetId(rec.asset.toString())
    setMaintenanceType(rec.maintenance_type)
    setDescription(rec.description)
    setScheduledDate(rec.scheduled_date)
    setCompletedDate(rec.completed_date || '')
    setCost(rec.cost || '')
    setTechnicianName(rec.technician_name)
    setStatus(rec.status)
    setNotes(rec.notes)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await apiClient.delete(`/assets/maintenance/${deleteTarget.id}/`)
      setDeleteTarget(null)
      loadData()
    } catch {
      setDeleteError('Failed to delete maintenance record.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ASSETS & MAINTENANCE"
        badgeColor="orange"
        title="Asset Maintenance"
        subtitle="Schedule and record preventive or corrective maintenance tasks."
        icon="🏗️"
      />

      <form onSubmit={handleSubmit} className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">{editingId ? 'Edit Record' : 'Log Maintenance'}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Asset</label>
            <select
              required
              disabled={!!editingId}
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm disabled:opacity-50"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
            >
              <option value="">Select Asset</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.asset_code} - {a.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Type</label>
            <select
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value)}
            >
              <option>Preventive</option>
              <option>Corrective</option>
              <option>Emergency</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Technician</label>
            <input
              required
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Status</label>
            <select
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Scheduled Date</label>
            <input
              type="date"
              required
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Completed Date</label>
            <input
              type="date"
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Cost</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Description</label>
            <textarea
              required
              rows={2}
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Notes</label>
            <textarea
              rows={2}
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button
            type="submit"
            disabled={isProcessing}
            className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {isProcessing ? 'Saving...' : editingId ? 'Update Record' : 'Save Record'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-white/[0.09] px-6 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Maintenance Records</h2>
        {error ? <p className="mt-4 text-xs text-rose-300">{error}</p> : null}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/[0.07] text-slate-400">
              <tr>
                <th className="px-3 py-3 font-medium">Asset</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Technician</th>
                <th className="px-3 py-3 font-medium">Scheduled</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {records.map((row) => (
                <tr key={row.id} className="group hover:bg-white/[0.02]">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-200">{row.asset_name}</p>
                    <p className="text-xs text-slate-400">{row.asset_code}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-300">{row.maintenance_type}</td>
                  <td className="px-3 py-3 text-slate-300">{row.technician_name}</td>
                  <td className="px-3 py-3 text-slate-300">{row.scheduled_date}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      row.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      row.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-slate-700/40 text-slate-400'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(row)}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(row)}
                        className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!records.length && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    No maintenance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Record"
        description={`Are you sure you want to delete this maintenance record for ${deleteTarget?.asset_name}?`}
        confirmLabel="Delete"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
