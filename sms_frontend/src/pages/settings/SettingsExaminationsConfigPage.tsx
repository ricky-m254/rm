import { useState } from 'react'
import { apiClient } from '../../api/client'
import { ClipboardList, Plus, Trash2, AlertCircle, Check } from 'lucide-react'
import PageHero from '../../components/PageHero'

const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 transition placeholder:text-slate-600'

interface ExamType { name: string; code: string; weight: number; requires_approval: boolean }
interface GradeScale { min: number; max: number; grade: string; points: number; remark: string }

const DEFAULT_EXAM_TYPES: ExamType[] = [
  { name: 'Mid-Term Examination', code: 'MID', weight: 30, requires_approval: false },
  { name: 'End of Term Examination', code: 'END', weight: 70, requires_approval: true },
  { name: 'Mock / Pre-National Exam', code: 'MOCK', weight: 0, requires_approval: true },
  { name: 'Continuous Assessment', code: 'CAT', weight: 0, requires_approval: false },
]

const DEFAULT_GRADE_SCALE: GradeScale[] = [
  { min: 80, max: 100, grade: 'A', points: 12, remark: 'Excellent' },
  { min: 75, max: 79, grade: 'A-', points: 11, remark: 'Very Good' },
  { min: 70, max: 74, grade: 'B+', points: 10, remark: 'Good' },
  { min: 65, max: 69, grade: 'B', points: 9, remark: 'Good' },
  { min: 60, max: 64, grade: 'B-', points: 8, remark: 'Above Average' },
  { min: 55, max: 59, grade: 'C+', points: 7, remark: 'Average' },
  { min: 50, max: 54, grade: 'C', points: 6, remark: 'Average' },
  { min: 45, max: 49, grade: 'C-', points: 5, remark: 'Below Average' },
  { min: 40, max: 44, grade: 'D+', points: 4, remark: 'Below Average' },
  { min: 35, max: 39, grade: 'D', points: 3, remark: 'Poor' },
  { min: 30, max: 34, grade: 'D-', points: 2, remark: 'Very Poor' },
  { min: 0, max: 29, grade: 'E', points: 1, remark: 'Fail' },
]

export default function SettingsExaminationsConfigPage() {
  const [examTypes, setExamTypes] = useState<ExamType[]>(DEFAULT_EXAM_TYPES)
  const [gradeScale, setGradeScale] = useState<GradeScale[]>(DEFAULT_GRADE_SCALE)
  const [passMarkDefault, setPassMarkDefault] = useState(40)
  const [reportCardHeader, setReportCardHeader] = useState('Student Academic Report Card')
  const [publishResults, setPublishResults] = useState('after_approval')
  const [allowResultEdit, setAllowResultEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const totalWeight = examTypes.reduce((a, b) => a + (b.weight || 0), 0)

  const save = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      await apiClient.patch('/school/profile/', {
        examination_config: { exam_types: examTypes, grade_scale: gradeScale, pass_mark: passMarkDefault, report_card_header: reportCardHeader, publish_results: publishResults, allow_result_edit: allowResultEdit }
      })
      setSuccess('Examination configuration saved.')
    } catch { setError('Failed to save. Check your settings.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHero
        badge="SETTINGS"
        badgeColor="slate"
        title="Examinations Config"
        subtitle="Exam schedule, rules and marking schemes"
        icon="⚙️"
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Examination Configuration</h1>
        <p className="mt-1 text-sm text-slate-400">Configure exam types, grading scales, report card settings, and approval workflows for your school's examination system.</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{success}</div>}

      {/* Exam Types */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Exam Types</h2>
          </div>
          <span className={`text-xs px-2 py-1 rounded-lg ${totalWeight === 100 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
            Total Weight: {totalWeight}% {totalWeight !== 100 && '(should equal 100%)'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/[0.07] text-[10px] text-slate-500 uppercase tracking-widest">
              <th className="text-left pb-2 font-semibold">Name</th>
              <th className="text-left pb-2 pl-2 font-semibold">Code</th>
              <th className="text-left pb-2 pl-2 font-semibold">Weight %</th>
              <th className="text-left pb-2 pl-2 font-semibold">Approval?</th>
              <th className="w-8 pb-2"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-800/50">
              {examTypes.map((e, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2"><input value={e.name} onChange={ev => setExamTypes(p => p.map((x, j) => j === i ? { ...x, name: ev.target.value } : x))} className={cls} /></td>
                  <td className="py-1.5 px-2"><input value={e.code} onChange={ev => setExamTypes(p => p.map((x, j) => j === i ? { ...x, code: ev.target.value } : x))} className={`${cls} font-mono`} /></td>
                  <td className="py-1.5 px-2"><input type="number" min={0} max={100} value={e.weight} onChange={ev => setExamTypes(p => p.map((x, j) => j === i ? { ...x, weight: +ev.target.value } : x))} className={cls} /></td>
                  <td className="py-1.5 px-2">
                    <select value={e.requires_approval ? 'yes' : 'no'} onChange={ev => setExamTypes(p => p.map((x, j) => j === i ? { ...x, requires_approval: ev.target.value === 'yes' } : x))} className={cls}>
                      <option value="no">No</option><option value="yes">Yes</option>
                    </select>
                  </td>
                  <td className="py-1.5 pl-2"><button onClick={() => setExamTypes(p => p.filter((_, j) => j !== i))} className="text-slate-600 hover:text-rose-400 transition"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => setExamTypes(p => [...p, { name: '', code: '', weight: 0, requires_approval: false }])}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300">
          <Plus className="h-3.5 w-3.5" /> Add Exam Type
        </button>
      </section>

      {/* Grading Scale */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Grading Scale</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 mb-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Default Pass Mark</label>
            <input type="number" min={0} max={100} value={passMarkDefault} onChange={e => setPassMarkDefault(+e.target.value)} className={cls} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/[0.07] text-[10px] text-slate-500 uppercase tracking-widest">
              <th className="text-left pb-2 font-semibold">Min%</th>
              <th className="text-left pb-2 pl-2 font-semibold">Max%</th>
              <th className="text-left pb-2 pl-2 font-semibold">Grade</th>
              <th className="text-left pb-2 pl-2 font-semibold">Points</th>
              <th className="text-left pb-2 pl-2 font-semibold">Remark</th>
              <th className="w-8 pb-2"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-800/50">
              {gradeScale.map((g, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2"><input type="number" value={g.min} onChange={e => setGradeScale(p => p.map((x, j) => j === i ? { ...x, min: +e.target.value } : x))} className={`${cls} w-20`} /></td>
                  <td className="py-1.5 px-2"><input type="number" value={g.max} onChange={e => setGradeScale(p => p.map((x, j) => j === i ? { ...x, max: +e.target.value } : x))} className={`${cls} w-20`} /></td>
                  <td className="py-1.5 px-2"><input value={g.grade} onChange={e => setGradeScale(p => p.map((x, j) => j === i ? { ...x, grade: e.target.value } : x))} className={`${cls} w-20 font-bold text-center`} /></td>
                  <td className="py-1.5 px-2"><input type="number" value={g.points} onChange={e => setGradeScale(p => p.map((x, j) => j === i ? { ...x, points: +e.target.value } : x))} className={`${cls} w-20`} /></td>
                  <td className="py-1.5 px-2"><input value={g.remark} onChange={e => setGradeScale(p => p.map((x, j) => j === i ? { ...x, remark: e.target.value } : x))} className={cls} /></td>
                  <td className="py-1.5 pl-2"><button onClick={() => setGradeScale(p => p.filter((_, j) => j !== i))} className="text-slate-600 hover:text-rose-400 transition"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => setGradeScale(p => [...p, { min: 0, max: 0, grade: '', points: 0, remark: '' }])}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300">
          <Plus className="h-3.5 w-3.5" /> Add Grade Band
        </button>
      </section>

      {/* Report Card & Publishing */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="h-4 w-4 text-sky-400" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Report Card & Publishing</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Report Card Header Text</label>
            <input value={reportCardHeader} onChange={e => setReportCardHeader(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Results Published</label>
            <select value={publishResults} onChange={e => setPublishResults(e.target.value)} className={cls}>
              <option value="immediately">Immediately after entry</option>
              <option value="after_approval">After admin approval</option>
              <option value="on_set_date">On set publish date</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Allow Mark Editing After Entry</label>
            <select value={allowResultEdit ? 'yes' : 'no'} onChange={e => setAllowResultEdit(e.target.value === 'yes')} className={cls}>
              <option value="no">No — locked after entry</option>
              <option value="yes">Yes — admin can override</option>
            </select>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-8 py-2.5 text-sm font-bold text-slate-950 transition">
          {saving ? 'Saving…' : 'Save Examination Configuration'}
        </button>
      </div>
    </div>
  )
}
