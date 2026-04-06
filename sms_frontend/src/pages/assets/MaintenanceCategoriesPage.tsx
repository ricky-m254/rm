import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Pencil, Trash2, X, Tag } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface Category {
  id: number
  name: string
  description: string
  is_active: boolean
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

const emptyForm = () => ({ name: '', description: '', is_active: true })

export default function MaintenanceCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/maintenance/categories/')
      setCategories(asArray(res.data))
    } catch { setError('Unable to load categories.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setError(null); setModal(true) }
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, description: c.description, is_active: c.is_active }); setError(null); setModal(true) }

  const save = async () => {
    if (!form.name.trim()) { setError('Category name is required.'); return }
    setSaving(true); setError(null)
    try {
      if (editing) {
        await apiClient.put(`/maintenance/categories/${editing.id}/`, form)
        setNotice('Category updated.')
      } else {
        await apiClient.post('/maintenance/categories/', form)
        setNotice('Category created.')
      }
      setModal(false); await load()
    } catch { setError('Unable to save category.') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this category?')) return
    try { await apiClient.delete(`/maintenance/categories/${id}/`); setNotice('Category deleted.'); await load() }
    catch { setError('Unable to delete category.') }
  }

  const setF = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHero
        badge="ASSETS & MAINTENANCE"
        badgeColor="orange"
        title="Maintenance Categories"
        subtitle="Manage maintenance types and response priorities."
        icon="🔧"
      />
        <button onClick={openCreate} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
          + Add Category
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <div className="rounded-2xl glass-panel overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-white/[0.07] bg-slate-950/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No categories yet.</td></tr>
            ) : categories.map(c => (
              <tr key={c.id} className="hover:bg-white/[0.025] transition">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-slate-500" />
                    <span className="font-medium text-white">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-400 text-xs max-w-xs truncate">{c.description || '—'}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${c.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(c.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Category' : 'New Category'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Name *</label>
              <input value={form.name} onChange={e => setF('name', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" placeholder="e.g. Electrical" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={2} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setF('is_active', e.target.checked)} className="rounded" />
              Active
            </label>
            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 hover:bg-emerald-400 transition">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
