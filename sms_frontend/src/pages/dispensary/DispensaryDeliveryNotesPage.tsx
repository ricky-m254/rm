import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type DeliveryItem = { id: number; medication_name: string; quantity: string; unit: string; unit_cost: string; total_cost: string }
type DeliveryNote = {
  id: number; reference_number: string; supplier: string; delivery_date: string
  status: string; notes: string; items: DeliveryItem[]
  finance_expense_id: number | null; received_by_name: string; grand_total: string
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function DispensaryDeliveryNotesPage() {
  const [notes, setNotes] = useState<DeliveryNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [supplier, setSupplier] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [itemMedicationName, setItemMedicationName] = useState('')
  const [itemQty, setItemQty] = useState('1')
  const [itemUnit, setItemUnit] = useState('tablets')
  const [itemUnitCost, setItemUnitCost] = useState('0')
  const [addingItem, setAddingItem] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<DeliveryNote | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<DeliveryNote[] | { results: DeliveryNote[] }>('/dispensary/delivery-notes/')
      setNotes(asArray(res.data))
    } catch { setError('Unable to load delivery notes.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const createNote = async () => {
    if (!supplier.trim() || !deliveryDate) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/dispensary/delivery-notes/', { supplier: supplier.trim(), delivery_date: deliveryDate, notes: noteText, status: 'Pending' })
      setSupplier(''); setNoteText(''); setNotice('Delivery note created.')
      await load()
    } catch { setError('Unable to create delivery note.') }
    finally { setSaving(false) }
  }

  const addItem = async (noteId: number) => {
    if (!itemMedicationName.trim() || !itemQty) return
    setAddingItem(true)
    try {
      await apiClient.post(`/dispensary/delivery-notes/${noteId}/add-item/`, {
        medication_name: itemMedicationName.trim(), quantity: Number(itemQty),
        unit: itemUnit, unit_cost: Number(itemUnitCost),
      })
      setItemMedicationName(''); setItemQty('1'); setItemUnit('tablets'); setItemUnitCost('0')
      await load()
    } catch { setError('Unable to add item.') }
    finally { setAddingItem(false) }
  }

  const markReceived = async (noteId: number) => {
    setError(null); setNotice(null)
    try {
      await apiClient.post(`/dispensary/delivery-notes/${noteId}/mark-received/`)
      setNotice('Delivery note marked as received.'); await load()
    } catch { setError('Unable to mark as received.') }
  }

  const linkFinance = async (noteId: number) => {
    setError(null); setNotice(null)
    try {
      await apiClient.post(`/dispensary/delivery-notes/${noteId}/link-finance/`)
      setNotice('Delivery note linked to finance.'); await load()
    } catch { setError('Unable to link to finance.') }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/dispensary/delivery-notes/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete delivery note.') }
    finally { setDeleting(false) }
  }

  const statusColors: Record<string, string> = {
    Pending: 'bg-amber-500/10 text-amber-400',
    Received: 'bg-emerald-500/10 text-emerald-400',
    Cancelled: 'bg-rose-500/10 text-rose-400',
  }

  const fmt = (v: string | number) => `Ksh ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6">
      <PageHero
        badge="DISPENSARY"
        badgeColor="rose"
        title="Delivery Notes"
        subtitle="Track medication deliveries from suppliers. Add items, mark received, and link to finance."
        icon="💊"
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <div className="rounded-2xl glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">New Delivery Note</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name *" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Notes" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
        </div>
        <button onClick={createNote} disabled={saving || !supplier.trim()} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Create Delivery Note'}</button>
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-sm text-slate-400 px-2">Loading…</p> : notes.map(n => (
          <div key={n.id} className="rounded-2xl glass-panel">
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-slate-100">{n.supplier}</p>
                <p className="text-xs text-slate-400">{n.delivery_date} {n.reference_number ? `· ${n.reference_number}` : ''}</p>
                <p className="mt-1 text-xs text-slate-500">{n.items?.length ?? 0} items · Total: {n.grand_total ? fmt(n.grand_total) : 'Ksh 0.00'}{n.finance_expense_id ? ' · Finance linked' : ''}</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[n.status] ?? 'bg-slate-700/40 text-slate-400'}`}>{n.status}</span>
                <button onClick={() => setExpandedId(expandedId === n.id ? null : n.id)} className="text-xs font-semibold text-sky-400 hover:text-sky-300">{expandedId === n.id ? 'Close' : 'Items'}</button>
                {n.status !== 'Received' ? <button onClick={() => markReceived(n.id)} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">Mark Received</button> : null}
                {!n.finance_expense_id ? <button onClick={() => linkFinance(n.id)} className="text-xs font-semibold text-amber-400 hover:text-amber-300">→ Finance</button> : null}
                <button onClick={() => setDeleteTarget(n)} className="text-xs font-semibold text-rose-400 hover:text-rose-300">Delete</button>
              </div>
            </div>
            {expandedId === n.id ? (
              <div className="border-t border-white/[0.07] p-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 mb-3">
                  <input value={itemMedicationName} onChange={e => setItemMedicationName(e.target.value)} placeholder="Medication name *" className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1.5 text-sm sm:col-span-2 lg:col-span-1" />
                  <input type="number" value={itemQty} onChange={e => setItemQty(e.target.value)} placeholder="Qty" min={1} className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1.5 text-sm" />
                  <select value={itemUnit} onChange={e => setItemUnit(e.target.value)} className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1.5 text-sm">
                    <option>tablets</option><option>capsules</option><option>ml</option><option>bottles</option><option>sachets</option><option>vials</option>
                  </select>
                  <input value={itemUnitCost} onChange={e => setItemUnitCost(e.target.value)} placeholder="Unit cost" className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1.5 text-sm" />
                  <button onClick={() => addItem(n.id)} disabled={addingItem || !itemMedicationName.trim()} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-50">Add Item</button>
                </div>
                <div className="space-y-1">
                  {(n.items ?? []).map(item => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
                      <span className="flex-1 font-semibold">{item.medication_name}</span>
                      <span className="text-slate-500">{item.quantity} {item.unit}</span>
                      <span className="text-slate-500">@ {fmt(item.unit_cost)}</span>
                      <span className="text-emerald-400">{fmt(item.total_cost)}</span>
                    </div>
                  ))}
                  {(n.items ?? []).length === 0 ? <p className="text-xs text-slate-500">No items yet. Add items above.</p> : null}
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {!loading && notes.length === 0 ? <p className="text-sm text-slate-500 px-2">No delivery notes found.</p> : null}
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Delivery Note" description={`Delete delivery note from "${deleteTarget?.supplier}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
