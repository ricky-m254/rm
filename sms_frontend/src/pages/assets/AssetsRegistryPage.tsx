import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Asset = {
  id: number
  asset_code: string
  name: string
  category: number | null
  category_name?: string
  description: string
  serial_number: string
  manufacturer: string
  model: string
  purchase_date: string | null
  purchase_cost: string
  current_value: string
  location: string
  status: string
  condition: string
  notes: string
}

type Category = {
  id: number
  name: string
}

export default function AssetsRegistryPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('')
  const [serialNumber, setSerialNumber] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [purchaseCost, setPurchaseCost] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('Active')
  const [condition, setCondition] = useState('Good')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [assetsRes, catsRes] = await Promise.all([
        apiClient.get<Asset[]>(`/assets/${statusFilter ? `?status=${statusFilter}` : ''}`),
        apiClient.get<Category[]>('/assets/categories/'),
      ])
      setAssets(assetsRes.data)
      setCategories(catsRes.data)
    } catch {
      setError('Unable to load registry data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setCategory('')
    setSerialNumber('')
    setPurchaseDate('')
    setPurchaseCost('')
    setCurrentValue('')
    setLocation('')
    setStatus('Active')
    setCondition('Good')
    setDescription('')
    setNotes('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name) return
    setIsProcessing(true)
    const payload = {
      name,
      category: category ? parseInt(category) : null,
      serial_number: serialNumber,
      purchase_date: purchaseDate || null,
      purchase_cost: purchaseCost || '0.00',
      current_value: currentValue || '0.00',
      location,
      status,
      condition,
      description,
      notes,
    }

    try {
      if (editingId) {
        await apiClient.put(`/assets/${editingId}/`, payload)
      } else {
        await apiClient.post('/assets/', payload)
      }
      resetForm()
      loadData()
    } catch {
      setError('Failed to save asset.')
    } finally {
      setIsProcessing(true)
      setIsProcessing(false)
    }
  }

  const handleEdit = (asset: Asset) => {
    setEditingId(asset.id)
    setName(asset.name)
    setCategory(asset.category?.toString() || '')
    setSerialNumber(asset.serial_number)
    setPurchaseDate(asset.purchase_date || '')
    setPurchaseCost(asset.purchase_cost)
    setCurrentValue(asset.current_value)
    setLocation(asset.location)
    setStatus(asset.status)
    setCondition(asset.condition)
    setDescription(asset.description)
    setNotes(asset.notes)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await apiClient.delete(`/assets/${deleteTarget.id}/`)
      setDeleteTarget(null)
      loadData()
    } catch {
      setDeleteError('Failed to delete asset.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ASSETS & MAINTENANCE"
        badgeColor="orange"
        title="Asset Registry"
        subtitle="Manage school assets, tracking codes and lifecycle status."
        icon="🏗️"
      />

      <form onSubmit={handleSubmit} className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">{editingId ? 'Edit Asset' : 'Add New Asset'}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Asset Name</label>
            <input
              required
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Category</label>
            <select
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">No Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Serial Number</label>
            <input
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Purchase Date</label>
            <input
              type="date"
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Purchase Cost</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={purchaseCost}
              onChange={(e) => setPurchaseCost(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Current Value</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Location</label>
            <input
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Status</label>
            <select
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>Active</option>
              <option>In Repair</option>
              <option>Retired</option>
              <option>Disposed</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Condition</label>
            <select
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option>Excellent</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Poor</option>
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
           <div className="space-y-1">
            <label className="text-xs text-slate-400">Description</label>
            <textarea
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
            {isProcessing ? 'Saving...' : editingId ? 'Update Asset' : 'Register Asset'}
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Asset Inventory</h2>
          <select
            className="rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="In Repair">In Repair</option>
            <option value="Retired">Retired</option>
            <option value="Disposed">Disposed</option>
          </select>
        </div>

        {error ? <p className="mt-4 text-xs text-rose-300">{error}</p> : null}

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/[0.07] text-slate-400">
              <tr>
                <th className="px-3 py-3 font-medium">Code/Name</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Value</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Condition</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {assets.map((asset) => (
                <tr key={asset.id} className="group hover:bg-white/[0.02]">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-200">{asset.asset_code}</p>
                    <p className="text-xs text-slate-400">{asset.name}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-300">{asset.category_name || '-'}</td>
                  <td className="px-3 py-3 text-slate-300">${Number(asset.current_value).toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      asset.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                      asset.status === 'In Repair' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-300">{asset.condition}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(asset)}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(asset)}
                        className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!assets.length && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    No assets found in registry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Asset"
        description={`Are you sure you want to delete ${deleteTarget?.name} (${deleteTarget?.asset_code})? This action cannot be undone.`}
        confirmLabel="Delete"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
