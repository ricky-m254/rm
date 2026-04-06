import { useState } from 'react'
import { apiClient } from '../../api/client'
import { BookOpen, Plus, Trash2, AlertCircle, Check } from 'lucide-react'
import PageHero from '../../components/PageHero'

const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 transition placeholder:text-slate-600'

interface BookCategory { name: string; max_borrow: number; loan_days: number }

export default function SettingsLibraryConfigPage() {
  const [maxBorrowDefault] = useState(3)
  const [loanDurationDays, setLoanDurationDays] = useState(14)
  const [finePerDay, setFinePerDay] = useState(5)
  const [fineCurrency, setFineCurrency] = useState('Ksh')
  const [maxRenewals, setMaxRenewals] = useState(2)
  const [overdueAlertDays, setOverdueAlertDays] = useState(2)
  const [studentMaxBorrow, setStudentMaxBorrow] = useState(2)
  const [teacherMaxBorrow, setTeacherMaxBorrow] = useState(5)
  const [allowReservation, setAllowReservation] = useState(true)
  const [categories, setCategories] = useState<BookCategory[]>([
    { name: 'Textbooks', max_borrow: 3, loan_days: 30 },
    { name: 'Reference Books', max_borrow: 0, loan_days: 0 },
    { name: 'Novels / Fiction', max_borrow: 2, loan_days: 14 },
    { name: 'Magazines', max_borrow: 1, loan_days: 7 },
    { name: 'Journals', max_borrow: 1, loan_days: 7 },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const save = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      await apiClient.patch('/school/profile/', {
        library_config: { max_borrow_default: maxBorrowDefault, loan_duration_days: loanDurationDays, fine_per_day: finePerDay, max_renewals: maxRenewals, overdue_alert_days: overdueAlertDays, student_max_borrow: studentMaxBorrow, teacher_max_borrow: teacherMaxBorrow, allow_reservation: allowReservation, categories }
      })
      setSuccess('Library configuration saved.')
    } catch { setError('Failed to save.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHero
        badge="SETTINGS"
        badgeColor="slate"
        title="Library Config"
        subtitle="Fine rates, loan periods and catalogue settings"
        icon="⚙️"
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Library Configuration</h1>
        <p className="mt-1 text-sm text-slate-400">Configure book borrowing rules, loan durations, overdue fines, and book categories for your school library.</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{success}</div>}

      {/* Borrowing Rules */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-sky-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Borrowing Rules</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Student Max Books</label>
            <input type="number" min={0} max={20} value={studentMaxBorrow} onChange={e => setStudentMaxBorrow(+e.target.value)} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Teacher Max Books</label>
            <input type="number" min={0} max={20} value={teacherMaxBorrow} onChange={e => setTeacherMaxBorrow(+e.target.value)} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Default Loan Duration (days)</label>
            <input type="number" min={1} value={loanDurationDays} onChange={e => setLoanDurationDays(+e.target.value)} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Max Renewals Allowed</label>
            <input type="number" min={0} max={10} value={maxRenewals} onChange={e => setMaxRenewals(+e.target.value)} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Allow Book Reservations</label>
            <select value={allowReservation ? 'yes' : 'no'} onChange={e => setAllowReservation(e.target.value === 'yes')} className={cls}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Alert for Overdue (days before)</label>
            <input type="number" min={0} value={overdueAlertDays} onChange={e => setOverdueAlertDays(+e.target.value)} className={cls} />
          </div>
        </div>
      </section>

      {/* Overdue Fines */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-amber-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Overdue Fine Policy</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Fine Per Day Overdue</label>
            <div className="flex gap-2">
              <input value={fineCurrency} onChange={e => setFineCurrency(e.target.value)} className="w-24 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 font-mono" />
              <input type="number" min={0} step={0.5} value={finePerDay} onChange={e => setFinePerDay(+e.target.value)} className={`${cls} flex-1`} />
            </div>
            <p className="text-[10px] text-slate-600 mt-1">Fine automatically added to student's account on the Finance module.</p>
          </div>
        </div>
      </section>

      {/* Book Categories */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Book Categories</h2></div>
        <p className="text-xs text-slate-500">Each category can have its own borrowing rules that override the defaults. Set max_borrow = 0 for reference-only books.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/[0.07] text-[10px] text-slate-500 uppercase tracking-widest">
              <th className="text-left pb-2 font-semibold">Category Name</th>
              <th className="text-left pb-2 pl-2 font-semibold">Max Borrow</th>
              <th className="text-left pb-2 pl-2 font-semibold">Loan Days</th>
              <th className="w-8 pb-2"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-800/50">
              {categories.map((c, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2"><input value={c.name} onChange={e => setCategories(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={cls} /></td>
                  <td className="py-1.5 px-2"><input type="number" min={0} value={c.max_borrow} onChange={e => setCategories(p => p.map((x, j) => j === i ? { ...x, max_borrow: +e.target.value } : x))} className={cls} /></td>
                  <td className="py-1.5 px-2"><input type="number" min={0} value={c.loan_days} onChange={e => setCategories(p => p.map((x, j) => j === i ? { ...x, loan_days: +e.target.value } : x))} className={cls} /></td>
                  <td className="py-1.5 pl-2"><button onClick={() => setCategories(p => p.filter((_, j) => j !== i))} className="text-slate-600 hover:text-rose-400 transition"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => setCategories(p => [...p, { name: '', max_borrow: 2, loan_days: 14 }])}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300">
          <Plus className="h-3.5 w-3.5" /> Add Category
        </button>
      </section>

      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-8 py-2.5 text-sm font-bold text-slate-950 transition">
          {saving ? 'Saving…' : 'Save Library Configuration'}
        </button>
      </div>
    </div>
  )
}
