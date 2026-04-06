import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { AlertTriangle, ShieldCheck, Leaf, Wheat, Milk, Nut } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Enrollment = {
  id: number
  student: number
  student_name: string
  admission_number?: string
  meal_plan_name: string
  dietary_notes: string
  is_active: boolean
}

const DIETARY_TAGS = [
  { label: 'Vegetarian', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: Leaf, keywords: ['vegetarian', 'veg'] },
  { label: 'Vegan', color: '#34d399', bg: 'rgba(52,211,153,0.12)', icon: Leaf, keywords: ['vegan'] },
  { label: 'Halal', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', icon: ShieldCheck, keywords: ['halal'] },
  { label: 'Gluten-Free', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Wheat, keywords: ['gluten', 'celiac'] },
  { label: 'Lactose-Free', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', icon: Milk, keywords: ['lactose', 'dairy'] },
  { label: 'Nut Allergy', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: Nut, keywords: ['nut', 'peanut'] },
]

const ALLERGY_TYPES = ['Nuts', 'Dairy', 'Eggs', 'Gluten', 'Shellfish', 'Soy', 'Fish', 'Wheat']

function detectTags(notes: string) {
  const lower = notes.toLowerCase()
  return DIETARY_TAGS.filter(tag => tag.keywords.some(k => lower.includes(k)))
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v?.results ?? [])
}

export default function CafeteriaDietaryPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const [editId, setEditId] = useState<number | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<Enrollment[] | { results: Enrollment[] }>('/cafeteria/enrollments/')
      setEnrollments(asArray(res.data))
    } catch {
      setError('Unable to load dietary records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const startEdit = (e: Enrollment) => {
    setEditId(e.id)
    setEditNotes(e.dietary_notes)
  }

  const saveNotes = async () => {
    if (editId === null) return
    setSaving(true)
    setError(null)
    try {
      await apiClient.patch(`/cafeteria/enrollments/${editId}/`, { dietary_notes: editNotes })
      setEditId(null)
      setNotice('Dietary notes updated.')
      await load()
    } catch {
      setError('Failed to save dietary notes.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = enrollments.filter(e => {
    if (!e.is_active) return false
    const q = search.toLowerCase()
    const matchSearch = !q || e.student_name.toLowerCase().includes(q)
    if (filter === 'all') return matchSearch
    const tags = detectTags(e.dietary_notes)
    return matchSearch && tags.some(t => t.label === filter)
  })

  const withDietary = enrollments.filter(e => e.is_active && e.dietary_notes.trim().length > 0)

  return (
    <div className="space-y-6">
      <PageHero
        badge="CAFETERIA"
        badgeColor="teal"
        title="Dietary & Allergy Management"
        subtitle="Track student dietary restrictions, allergens and special meal requirements"
        icon="🥗"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'With Dietary Notes', value: withDietary.length, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Active Enrollments', value: enrollments.filter(e => e.is_active).length, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
          { label: 'Allergy Alerts', value: withDietary.filter(e => detectTags(e.dietary_notes).some(t => t.label.includes('Allergy'))).length, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          { label: 'Dietary Types', value: DIETARY_TAGS.length, color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-5" style={{ background: k.bg, border: `1px solid ${k.color}25` }}>
            <p className="text-2xl font-bold text-white tabular-nums">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Dietary Type Key */}
      <div className="rounded-2xl p-5" style={GLASS}>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Supported Dietary Types</p>
        <div className="flex flex-wrap gap-2">
          {DIETARY_TAGS.map(tag => (
            <button
              key={tag.label}
              onClick={() => setFilter(filter === tag.label ? 'all' : tag.label)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: filter === tag.label ? tag.color : tag.bg,
                color: filter === tag.label ? '#fff' : tag.color,
                border: `1px solid ${tag.color}40`,
              }}
            >
              <tag.icon size={11} />
              {tag.label}
            </button>
          ))}
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              Clear filter ×
            </button>
          )}
        </div>
      </div>

      {/* Allergy reference panel */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-rose-400" />
          <p className="text-sm font-bold text-rose-300">Common Allergen Reference</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALLERGY_TYPES.map(a => (
            <span key={a} className="rounded-lg px-2.5 py-1 text-xs font-medium text-rose-300"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {a}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          When a restricted allergen appears in the weekly menu, the system will flag affected students. Ensure dietary notes below are kept up to date.
        </p>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={GLASS}>
        <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-bold text-white">Student Dietary Profiles</p>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search student…"
            className="w-full max-w-xs rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Student', 'Meal Plan', 'Dietary Notes', 'Detected Tags', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No students found.</td></tr>
              ) : filtered.map(e => {
                const tags = detectTags(e.dietary_notes)
                const isEditing = editId === e.id
                return (
                  <tr key={e.id} className="hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 font-semibold text-slate-200">{e.student_name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{e.meal_plan_name}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <input
                            value={editNotes}
                            onChange={ev => setEditNotes(ev.target.value)}
                            className="flex-1 rounded-lg border border-emerald-500/40 bg-slate-950 px-2 py-1 text-xs text-white outline-none"
                            placeholder="e.g. Vegetarian, Nut allergy"
                          />
                          <button onClick={saveNotes} disabled={saving}
                            className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-slate-900 disabled:opacity-50">
                            {saving ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-xs text-slate-500 hover:text-slate-300">×</button>
                        </div>
                      ) : (
                        <span className={`text-xs ${e.dietary_notes ? 'text-slate-300' : 'text-slate-600 italic'}`}>
                          {e.dietary_notes || 'None recorded'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tags.length > 0 ? tags.map(t => (
                          <span key={t.label} className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ background: t.bg, color: t.color }}>
                            {t.label}
                          </span>
                        )) : (
                          <span className="text-[10px] text-slate-600">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {!isEditing && (
                        <button onClick={() => startEdit(e)} className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition">
                          Edit notes
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
