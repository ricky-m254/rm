import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Category = {
  id: number
  name: string
  description: string
  depreciation_method: string
  useful_life_years: number | null
}

export default function AssetsCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [depreciationMethod, setDepreciationMethod] = useState('none')
  const [usefulLifeYears, setUsefulLifeYears] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.get<Category[]>('/assets/categories/')
      setCategories(res.data)
    } catch {
      setError('Unable to load categories.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setDepreciationMethod('none')
    setUsefulLifeYears('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name) return
    setIsProcessing(true)
    const payload = {
      name,
      description,
      depreciation_method: depreciationMethod,
      useful_life_years: usefulLifeYears ? parseInt(usefulLifeYears) : null,
    }

    try {
      if (editingId) {
        await apiClient.put(`/assets/categories/${editingId}/`, payload)
      } else {
        await apiClient.post('/assets/categories/', payload)
      }
      resetForm()
      loadData()
    } catch {
      setError('Failed to save category.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id)
    setName(cat.name)
    setDescription(cat.description)
    setDepreciationMethod(cat.depreciation_method)
    setUsefulLifeYears(cat.useful_life_years?.toString() || '')
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await apiClient.delete(`/assets/categories/${deleteTarget.id}/`)
      setDeleteTarget(null)
      loadData()
    } catch {
      setDeleteError('Failed to delete category. It might be in use.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ASSETS & MAINTENANCE"
        badgeColor="orange"
        title="Asset Categories"
        subtitle="Classify assets and define depreciation rules."
        icon="🏗️"
      />

      <form onSubmit={handleSubmit} className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">{editingId ? 'Edit Category' : 'Add New Category'}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Category Name</label>
            <input
              required
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Depreciation Method</label>
            <select
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={depreciationMethod}
              onChange={(e) => setDepreciationMethod(e.target.value)}
            >
              <option value="none">None</option>
              <option value="straight_line">Straight Line</option>
              <option value="declining_balance">Declining Balance</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Useful Life (Years)</label>
            <input
              type="number"
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={usefulLifeYears}
              onChange={(e) => setUsefulLifeYears(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Description</label>
            <input
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button
            type="submit"
            disabled={isProcessing}
            className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {isProcessing ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
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
        <h2 className="text-sm font-semibold text-slate-200">Category List</h2>
        {error ? <p className="mt-4 text-xs text-rose-300">{error}</p> : null}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/[0.07] text-slate-400">
              <tr>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Depreciation</th>
                <th className="px-3 py-3 font-medium">Useful Life</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {categories.map((cat) => (
                <tr key={cat.id} className="group hover:bg-white/[0.02]">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-200">{cat.name}</p>
                    <p className="text-xs text-slate-400">{cat.description}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-300 capitalize">
                    {cat.depreciation_method.replace('_', ' ')}
                  </td>
                  <td className="px-3 py-3 text-slate-300">{cat.useful_life_years || '-'} years</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!categories.length && !isLoading && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    No categories defined.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category"
        description={`Are you sure you want to delete the category "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
