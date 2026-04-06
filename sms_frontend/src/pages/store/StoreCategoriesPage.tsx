import { useEffect, useState } from 'react'
import { Tag, Plus, Edit2, Trash2, Package } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

type Category = {
  id: number
  name: string
  description: string
  item_type: string
  is_active: boolean
  item_count: number
}

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const TYPE_COLORS: Record<string, string> = {
  FOOD: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  OFFICE: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
  COMBINED: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
}
const BLANK = { name: '', description: '', item_type: 'OFFICE' }

function asArr<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function StoreCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/store/categories/')
      setCategories(asArr<Category>(res.data))
      setError(null)
    } catch {
      setError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function openAdd() {
    setEditTarget(null)
    setForm(BLANK)
    setShowModal(true)
  }

  function openEdit(cat: Category) {
    setEditTarget(cat)
    setForm({ name: cat.name, description: cat.description, item_type: cat.item_type })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editTarget) {
        await apiClient.patch(`/store/categories/${editTarget.id}/`, form)
        setNotice('Category updated.')
      } else {
        await apiClient.post('/store/categories/', form)
        setNotice('Category added.')
      }
      setShowModal(false)
      void load()
    } catch {
      setNotice('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat: Category) {
    setDeleting(true)
    try {
      await apiClient.delete(`/store/categories/${cat.id}/`)
      setNotice('Category deleted.')
      setDeleteTarget(null)
      void load()
    } catch {
      setNotice('Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  const active = categories.filter(c => c.is_active)
  const totalItems = categories.reduce((s, c) => s + (c.item_count ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHero
        title="Stock Categories"
        subtitle="Classify and organise inventory items by category"
        icon={Tag}
        theme="emerald"
        stats={[
          { label: 'Total Categories', value: categories.length },
          { label: 'Total Items', value: totalItems.toLocaleString() },
          { label: 'Active', value: active.length },
        ]}
      />

      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice} <button onClick={() => setNotice(null)} className="ml-2 text-xs underline">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{loading ? 'Loading…' : `${categories.length} categories configured`}</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={GLASS} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map(cat => (
            <div key={cat.id} className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`rounded-xl border px-3 py-1 text-xs font-semibold ${TYPE_COLORS[cat.item_type] ?? TYPE_COLORS.OFFICE}`}>
                    {cat.name}
                  </span>
                  {!cat.is_active && (
                    <span className="rounded-lg border border-slate-600/40 bg-slate-700/20 px-2 py-0.5 text-[10px] text-slate-500">Inactive</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(cat)} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteTarget(cat)} className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{cat.description || 'No description'}</p>
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/[0.06]">
                <Package size={14} className="text-slate-500" />
                <span className="text-sm text-slate-300">{(cat.item_count ?? 0).toLocaleString()} items</span>
                <span className="ml-auto text-[10px] text-slate-600 uppercase tracking-wide">{cat.item_type}</span>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-3 rounded-2xl py-16 text-center text-slate-500" style={GLASS}>
              No categories yet. Add your first category above.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1421] border border-white/[0.09] p-6 space-y-5">
            <h3 className="text-lg font-display font-semibold">{editTarget ? 'Edit Category' : 'Add Category'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Category Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g. Food Store"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                  placeholder="Brief description of this category"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Category Type</label>
                <select
                  value={form.item_type}
                  onChange={e => setForm(p => ({ ...p, item_type: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="FOOD">Food</option>
                  <option value="OFFICE">Office / Stationery</option>
                  <option value="COMBINED">Combined</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} disabled={saving} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:text-white transition">Cancel</button>
              <button onClick={() => void handleSave()} disabled={saving} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-60">
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1421] border border-white/[0.09] p-6 space-y-4">
            <h3 className="text-lg font-display font-semibold text-rose-400">Delete Category?</h3>
            <p className="text-sm text-slate-400">Are you sure you want to delete <strong className="text-white">{deleteTarget.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:text-white transition">Cancel</button>
              <button onClick={() => void handleDelete(deleteTarget)} disabled={deleting} className="flex-1 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 transition disabled:opacity-60">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
