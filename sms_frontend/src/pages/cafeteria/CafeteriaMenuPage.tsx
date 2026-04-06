import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type MealPlan = { id: number; name: string; is_active: boolean }
type WeeklyMenu = { id: number; week_start: string; meal_plan: number; meal_plan_name: string; monday_breakfast: string; monday_lunch: string; monday_supper: string; tuesday_breakfast: string; tuesday_lunch: string; tuesday_supper: string; wednesday_breakfast: string; wednesday_lunch: string; wednesday_supper: string; thursday_breakfast: string; thursday_lunch: string; thursday_supper: string; friday_breakfast: string; friday_lunch: string; friday_supper: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
const MEALS = ['breakfast', 'lunch', 'supper'] as const

const blankMenuFields = () => Object.fromEntries(DAYS.flatMap(d => MEALS.map(m => [`${d}_${m}`, '']))) as Record<string, string>

export default function CafeteriaMenuPage() {
  const [menus, setMenus] = useState<WeeklyMenu[]>([])
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [weekStart, setWeekStart] = useState('')
  const [planId, setPlanId] = useState('')
  const [fields, setFields] = useState<Record<string, string>>(blankMenuFields())
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<WeeklyMenu | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [mRes, pRes] = await Promise.all([
        apiClient.get<WeeklyMenu[] | { results: WeeklyMenu[] }>('/cafeteria/menus/'),
        apiClient.get<MealPlan[] | { results: MealPlan[] }>('/cafeteria/meal-plans/'),
      ])
      setMenus(asArray(mRes.data)); setPlans(asArray(pRes.data))
    } catch { setError('Unable to load menus.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const setField = (key: string, value: string) => setFields(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    if (!weekStart || !planId) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/cafeteria/menus/', { week_start: weekStart, meal_plan: Number(planId), ...fields })
      setWeekStart(''); setPlanId(''); setFields(blankMenuFields()); setShowForm(false)
      setNotice('Weekly menu created.'); await load()
    } catch { setError('Unable to create menu. A menu for this week and plan may already exist.') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/cafeteria/menus/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete menu.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="CAFETERIA"
        badgeColor="teal"
        title="Cafeteria Menu"
        subtitle="Daily and weekly meal menus"
        icon="🍽️"
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      {showForm ? (
        <div className="rounded-2xl glass-panel p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">New Weekly Menu</h2>
          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Week start (Monday) *</label>
              <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Meal Plan *</label>
              <select value={planId} onChange={e => setPlanId(e.target.value)} className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
                <option value="">Select plan</option>
                {plans.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-xs text-slate-400">
                  <th className="py-2 pr-3 text-left font-medium w-28">Day</th>
                  {MEALS.map(m => <th key={m} className="py-2 px-2 text-left font-medium capitalize">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day} className="border-b border-white/[0.04]">
                    <td className="py-2 pr-3 text-slate-300 capitalize font-medium">{day}</td>
                    {MEALS.map(meal => (
                      <td key={meal} className="py-1 px-2">
                        <input value={fields[`${day}_${meal}`]} onChange={e => setField(`${day}_${meal}`, e.target.value)} placeholder={`${day} ${meal}`} className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1.5 text-xs" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={save} disabled={saving || !weekStart || !planId} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Create Menu'}</button>
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? <p className="text-sm text-slate-400">Loading…</p> : menus.map(m => (
          <div key={m.id} className="rounded-2xl glass-panel">
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold text-slate-100">Week of {m.week_start}</p>
                <p className="text-xs text-slate-400">{m.meal_plan_name}</p>
              </div>
              <div className="flex gap-3 text-xs">
                <button onClick={() => setExpandedId(expandedId === m.id ? null : m.id)} className="font-semibold text-sky-400 hover:text-sky-300">{expandedId === m.id ? 'Hide' : 'View'}</button>
                <button onClick={() => setDeleteTarget(m)} className="font-semibold text-rose-400 hover:text-rose-300">Delete</button>
              </div>
            </div>
            {expandedId === m.id ? (
              <div className="border-t border-white/[0.07] overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="border-b border-white/[0.07] text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Day</th>
                      {MEALS.map(ml => <th key={ml} className="px-4 py-2 text-left font-medium capitalize">{ml}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map(day => (
                      <tr key={day} className="border-b border-white/[0.04] hover:bg-slate-800/20">
                        <td className="px-4 py-2 font-medium capitalize text-slate-300">{day}</td>
                        {MEALS.map(meal => (
                          <td key={meal} className="px-4 py-2 text-slate-400">
                            {(m as unknown as Record<string, string>)[`${day}_${meal}`] || <span className="text-slate-600 italic">–</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ))}
        {!loading && menus.length === 0 ? <p className="text-sm text-slate-500">No menus yet.</p> : null}
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Menu" description={`Delete menu for week of "${deleteTarget?.week_start}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
