import { useEffect, useState } from 'react'
import { Building2, Phone, Mail, MapPin, Package, Plus, Pencil, Trash2 } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Supplier = {
  id: number
  name: string
  contact_person: string
  phone: string
  email: string
  address: string
  product_types: string
  is_active: boolean
}

const BLANK: Omit<Supplier, 'id'> = { name: '', contact_person: '', phone: '', email: '', address: '', product_types: '', is_active: true }

function asArr<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function StoreSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Supplier | null>(null)
  const [form, setForm] = useState<Omit<Supplier, 'id'>>(BLANK)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/store/suppliers/')
      setSuppliers(asArr<Supplier>(res.data))
      setError(null)
    } catch {
      setError('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.contact_person.toLowerCase().includes(q) || s.product_types.toLowerCase().includes(q)
    const matchActive = filterActive === 'all' || (filterActive === 'active' ? s.is_active : !s.is_active)
    return matchSearch && matchActive
  })

  function openAdd() {
    setEditTarget(null)
    setForm(BLANK)
    setShowForm(true)
  }

  function openEdit(s: Supplier) {
    setEditTarget(s)
    setForm({ name: s.name, contact_person: s.contact_person, phone: s.phone, email: s.email, address: s.address, product_types: s.product_types, is_active: s.is_active })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editTarget) {
        await apiClient.patch(`/store/suppliers/${editTarget.id}/`, form)
        setNotice('Supplier updated.')
      } else {
        await apiClient.post('/store/suppliers/', form)
        setNotice('Supplier added.')
      }
      setShowForm(false)
      void load()
    } catch {
      setNotice('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(s: Supplier) {
    setDeleting(true)
    try {
      await apiClient.delete(`/store/suppliers/${s.id}/`)
      setNotice('Supplier deleted.')
      setDeleteTarget(null)
      void load()
    } catch {
      setNotice('Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  const active = suppliers.filter(s => s.is_active).length

  return (
    <div className="space-y-6">
      <PageHero
        title="Suppliers"
        subtitle="Manage vendor and supplier contacts for store procurement"
        icon={Building2}
        theme="sky"
        stats={[
          { label: 'Total Suppliers', value: suppliers.length },
          { label: 'Active', value: active },
          { label: 'Inactive', value: suppliers.length - active },
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search suppliers…"
            className="rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
          />
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setFilterActive(f)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium capitalize transition ${filterActive === f ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30' : 'border border-white/[0.07] text-slate-400 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-44 rounded-2xl animate-pulse" style={GLASS} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(s => (
            <div key={s.id} className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{s.name}</p>
                  {!s.is_active && (
                    <span className="mt-1 inline-block rounded-lg bg-slate-700/30 border border-slate-600/30 px-2 py-0.5 text-[10px] text-slate-500">Inactive</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition"><Pencil size={13} /></button>
                  <button onClick={() => setDeleteTarget(s)} className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-slate-400">
                {s.contact_person && (
                  <div className="flex items-center gap-2"><Building2 size={12} className="text-slate-500 shrink-0" /><span>{s.contact_person}</span></div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2"><Phone size={12} className="text-slate-500 shrink-0" /><span>{s.phone}</span></div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2"><Mail size={12} className="text-slate-500 shrink-0" /><span className="truncate">{s.email}</span></div>
                )}
                {s.address && (
                  <div className="flex items-center gap-2"><MapPin size={12} className="text-slate-500 shrink-0" /><span className="text-xs">{s.address}</span></div>
                )}
              </div>
              {s.product_types && (
                <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
                  <Package size={12} className="text-slate-500" />
                  <span className="text-xs text-slate-500">{s.product_types}</span>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 rounded-2xl py-16 text-center text-slate-500" style={GLASS}>
              No suppliers found. Add your first supplier above.
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d1421] border border-white/[0.09] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-display font-semibold">{editTarget ? 'Edit Supplier' : 'Add Supplier'}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Supplier Name *', key: 'name', placeholder: 'e.g. Nairobi General Supplies', full: true },
                { label: 'Contact Person', key: 'contact_person', placeholder: 'e.g. James Mwangi' },
                { label: 'Phone', key: 'phone', placeholder: '+254 7XX XXX XXX' },
                { label: 'Email', key: 'email', placeholder: 'contact@supplier.co.ke' },
                { label: 'Address', key: 'address', placeholder: 'Industrial Area, Nairobi', full: true },
                { label: 'Product Types', key: 'product_types', placeholder: 'e.g. Food, Office Supplies', full: true },
              ].map(f => (
                <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                  <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
                  <input
                    value={(form as Record<string, string | boolean>)[f.key] as string}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  />
                </div>
              ))}
              <div className="col-span-2 flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
                <label htmlFor="is_active" className="text-sm text-slate-300">Active supplier</label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} disabled={saving} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:text-white transition">Cancel</button>
              <button onClick={() => void handleSave()} disabled={saving} className="flex-1 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition disabled:opacity-60">
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1421] border border-white/[0.09] p-6 space-y-4">
            <h3 className="text-lg font-display font-semibold text-rose-400">Delete Supplier?</h3>
            <p className="text-sm text-slate-400">Remove <strong className="text-white">{deleteTarget.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300">Cancel</button>
              <button onClick={() => void handleDelete(deleteTarget)} disabled={deleting} className="flex-1 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-60">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
