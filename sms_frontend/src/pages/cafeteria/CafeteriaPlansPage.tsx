import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'
import { Plus, RefreshCw, ToggleLeft, ToggleRight, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'

type MealPlan = { id: number; name: string; description: string; price_per_day: string; is_active: boolean }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

const fmt = (v: string | number) =>
  `Ksh ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`

export default function CafeteriaPlansPage() {
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pricePerDay, setPricePerDay] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<MealPlan | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<MealPlan[] | { results: MealPlan[] }>('/cafeteria/meal-plans/')
      setPlans(asArray(res.data))
    } catch { setError('Unable to load meal plans.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!name.trim() || !pricePerDay) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/cafeteria/meal-plans/', { name: name.trim(), description, price_per_day: Number(pricePerDay), is_active: isActive })
      setName(''); setDescription(''); setPricePerDay(''); setIsActive(true)
      setShowForm(false); setNotice('Meal plan created.')
      await load()
    } catch { setError('Unable to create meal plan.') }
    finally { setSaving(false) }
  }

  const toggleActive = async (plan: MealPlan) => {
    try {
      await apiClient.patch(`/cafeteria/meal-plans/${plan.id}/`, { is_active: !plan.is_active })
      await load()
    } catch { setError('Unable to update meal plan.') }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/cafeteria/meal-plans/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete meal plan.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHero
        badge="CAFETERIA"
        badgeColor="teal"
        title="Meal Plans"
        subtitle="Configure different meal plans and pricing."
        icon="🍽️"
        actions={
          <div className="flex gap-2">
            <button onClick={() => void load()}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-white/[0.09] hover:bg-slate-700 transition">
              <RefreshCw size={13} className="text-slate-400" />
            </button>
            <button onClick={() => setShowForm(f => !f)}
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-white hover:bg-teal-400 transition">
              <Plus size={15} /> New Plan
            </button>
          </div>
        }
      />

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">✕</button>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 size={14} />{notice}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-white/[0.08] p-5"
          style={{ background: 'rgba(255,255,255,0.025)' }}>
          <h3 className="text-sm font-bold text-slate-200 mb-4">New Meal Plan</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
              placeholder="Plan name *" value={name} onChange={e => setName(e.target.value)}
            />
            <input
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
              placeholder="Description" value={description} onChange={e => setDescription(e.target.value)}
            />
            <input
              type="number" min="0" step="0.01"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
              placeholder="Price per day (Ksh) *" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                className="accent-teal-500" />
              Active
            </label>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setShowForm(false)}
                className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition">
                Cancel
              </button>
              <button onClick={() => void save()} disabled={saving || !name.trim() || !pricePerDay}
                className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-white hover:bg-teal-400 transition disabled:opacity-40">
                {saving ? 'Saving…' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-600 text-sm">Loading meal plans…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.length === 0 && (
            <p className="col-span-3 text-sm text-slate-500 text-center py-12">
              No meal plans yet. Create your first plan above.
            </p>
          )}
          {plans.map(plan => (
            <div key={plan.id}
              className="rounded-2xl p-5 flex flex-col gap-3 transition-all"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: plan.is_active ? '1px solid rgba(20,184,166,0.25)' : '1px solid rgba(255,255,255,0.07)',
              }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-200">{plan.name}</p>
                  {plan.description && <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>}
                </div>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.is_active ? 'bg-teal-500/15 text-teal-400' : 'bg-slate-700/50 text-slate-500'}`}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="text-lg font-display font-bold text-teal-400">
                {fmt(plan.price_per_day)}
                <span className="text-xs text-slate-600 ml-1">/ day</span>
              </p>

              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/[0.06]">
                <button onClick={() => void toggleActive(plan)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition">
                  {plan.is_active
                    ? <ToggleRight size={15} className="text-teal-400" />
                    : <ToggleLeft size={15} />
                  }
                  {plan.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => setDeleteTarget(plan)}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium text-rose-500/70 hover:text-rose-400 transition">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Meal Plan"
        description={`Delete "${deleteTarget?.name}"? All associated menus and enrollments will be affected.`}
        confirmLabel="Delete"
        isProcessing={deleting}
        error={deleteError}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
