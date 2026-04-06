import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { ArrowRightLeft, CheckCircle2, AlertCircle, Search } from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const labelCls = 'block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1'
const inputCls = 'w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.06] transition'
const selectCls = inputCls + ' cursor-pointer'

type StudentOption = { id: number; admission_number: string; first_name: string; last_name: string }
type EmployeeOption = { id: number; employee_id: string; first_name: string; last_name: string }

export default function TransfersInitiatePage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const isAdmin = role === 'ADMIN' || role === 'TENANT_SUPER_ADMIN'
  const isParent = role === 'PARENT'

  const [form, setForm] = useState({
    transfer_type: 'student',
    entity_id: '',
    to_tenant_id: '',
    reason: '',
    effective_date: new Date().toISOString().slice(0, 10),
    from_class: '', to_class: '',
    from_stream: '', to_stream: '',
    from_department: '', to_department: '',
    from_role: '', to_role: '',
    notes: '',
  })

  const [students, setStudents] = useState<StudentOption[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<any>(null)
  const [error, setError] = useState('')

  const isInternal = form.transfer_type.startsWith('internal_')
  const isStudentType = form.transfer_type === 'student' || form.transfer_type === 'internal_student'
  const isStaffType = form.transfer_type === 'staff' || form.transfer_type === 'internal_staff'

  useEffect(() => {
    if (isStudentType) {
      const params = studentSearch ? `?search=${encodeURIComponent(studentSearch)}&page_size=30` : '?page_size=30'
      apiClient.get(`/students/${params}`).then((r) => setStudents(r.data.results || [])).catch(() => {})
    }
  }, [isStudentType, studentSearch])

  useEffect(() => {
    if (isStaffType) {
      apiClient.get('/staff/?page_size=50').then((r) => setEmployees(r.data.results || [])).catch(() => {})
    }
  }, [isStaffType])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(null)
    if (!form.entity_id) { setError('Please select a student or staff member.'); return }
    setSubmitting(true)
    try {
      const payload: any = { ...form, entity_id: parseInt(form.entity_id) }
      if (!isInternal && !form.to_tenant_id) { setError('Destination school is required for cross-tenant transfers.'); setSubmitting(false); return }
      const r = await apiClient.post('/transfers/initiate/', payload)
      setSuccess(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to initiate transfer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    const t = success.transfer
    return (
      <div className="space-y-6">
        <PageHero title="Transfer Initiated" subtitle="The transfer request has been created" icon={<ArrowRightLeft className="w-6 h-6 text-emerald-400" />} />
        <div style={GLASS} className="rounded-2xl border p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-100">Transfer #{t.id} Created</h2>
          <p className="text-slate-400 mt-2">Status: <span className="text-yellow-400 font-medium">{t.status_display}</span></p>
          <p className="text-slate-400 mt-1">{t.entity_name} · {t.type_display}</p>
          {success.warnings?.length > 0 && (
            <div className="mt-4 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-left">
              <p className="text-sm font-semibold text-orange-400 mb-2">Warnings</p>
              {success.warnings.map((w: string, i: number) => (
                <p key={i} className="text-xs text-orange-300">⚠ {w}</p>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-4">
            A data package has been generated. Awaiting source school approval.
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={() => navigate('/modules/transfers/dashboard')}
              className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition"
            >
              View All Transfers
            </button>
            <button
              onClick={() => { setSuccess(null); setForm((f) => ({ ...f, entity_id: '', reason: '', to_tenant_id: '' })) }}
              className="rounded-xl border border-white/[0.09] px-5 py-2 text-sm text-slate-300 hover:text-slate-100 transition"
            >
              Initiate Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Initiate Transfer"
        subtitle="Request a student or staff transfer between schools"
        icon={<ArrowRightLeft className="w-6 h-6 text-emerald-400" />}
      />

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={GLASS} className="rounded-2xl border p-6 space-y-6">
        {/* Transfer Type */}
        <div>
          <label className={labelCls}>Transfer Type</label>
          <select className={selectCls} value={form.transfer_type} onChange={(e) => set('transfer_type', e.target.value)}>
            {isAdmin && <option value="student">Student — Cross-Tenant (Other School)</option>}
            {isAdmin && <option value="internal_student">Student — Internal (Class/Stream Change)</option>}
            {(isParent) && <option value="student">Student — Transfer to Another School</option>}
            {isAdmin && <option value="staff">Staff — Cross-Tenant (Other School)</option>}
            {isAdmin && <option value="internal_staff">Staff — Internal (Department/Role Change)</option>}
          </select>
        </div>

        {/* Student / Staff picker */}
        {isStudentType && (
          <div>
            <label className={labelCls}>Student</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                className={inputCls + ' pl-9'}
                placeholder="Search by name or admission no…"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
            <select
              className={selectCls}
              value={form.entity_id}
              onChange={(e) => set('entity_id', e.target.value)}
              required
            >
              <option value="">— Select student —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.admission_number})
                </option>
              ))}
            </select>
          </div>
        )}

        {isStaffType && (
          <div>
            <label className={labelCls}>Staff Member</label>
            <select
              className={selectCls}
              value={form.entity_id}
              onChange={(e) => set('entity_id', e.target.value)}
              required
            >
              <option value="">— Select staff member —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name} ({e.employee_id})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Destination school — only for cross-tenant */}
        {!isInternal && (
          <div>
            <label className={labelCls}>Destination School ID</label>
            <input
              className={inputCls}
              placeholder="e.g. school_b (tenant schema name)"
              value={form.to_tenant_id}
              onChange={(e) => set('to_tenant_id', e.target.value)}
              required={!isInternal}
            />
            <p className="text-xs text-slate-500 mt-1">Enter the destination school's tenant identifier.</p>
          </div>
        )}

        {/* Internal: class/stream for student */}
        {form.transfer_type === 'internal_student' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>From Class</label>
              <input className={inputCls} placeholder="Current class" value={form.from_class} onChange={(e) => set('from_class', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>To Class</label>
              <input className={inputCls} placeholder="New class" value={form.to_class} onChange={(e) => set('to_class', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>From Stream</label>
              <input className={inputCls} placeholder="Current stream" value={form.from_stream} onChange={(e) => set('from_stream', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>To Stream</label>
              <input className={inputCls} placeholder="New stream" value={form.to_stream} onChange={(e) => set('to_stream', e.target.value)} />
            </div>
          </div>
        )}

        {/* Internal: dept/role for staff */}
        {form.transfer_type === 'internal_staff' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>From Department</label>
              <input className={inputCls} placeholder="Current department" value={form.from_department} onChange={(e) => set('from_department', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>To Department</label>
              <input className={inputCls} placeholder="New department" value={form.to_department} onChange={(e) => set('to_department', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>From Role</label>
              <input className={inputCls} placeholder="Current role" value={form.from_role} onChange={(e) => set('from_role', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>To Role</label>
              <input className={inputCls} placeholder="New role" value={form.to_role} onChange={(e) => set('to_role', e.target.value)} />
            </div>
          </div>
        )}

        {/* Effective date */}
        <div>
          <label className={labelCls}>Effective Date</label>
          <input
            type="date"
            className={inputCls}
            value={form.effective_date}
            onChange={(e) => set('effective_date', e.target.value)}
          />
        </div>

        {/* Reason */}
        <div>
          <label className={labelCls}>Reason for Transfer</label>
          <textarea
            className={inputCls}
            rows={3}
            placeholder="Explain the reason for this transfer…"
            value={form.reason}
            onChange={(e) => set('reason', e.target.value)}
          />
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>Additional Notes (optional)</label>
          <textarea
            className={inputCls}
            rows={2}
            placeholder="Any additional remarks…"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        {/* Fee warning */}
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 text-xs text-orange-300">
          <strong>Note:</strong> If the student has an outstanding fee balance, the transfer will be flagged. Fees must be cleared before execution.
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition disabled:opacity-60"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {submitting ? 'Initiating…' : 'Initiate Transfer'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/modules/transfers/dashboard')}
            className="rounded-xl border border-white/[0.09] px-5 py-2.5 text-sm text-slate-300 hover:text-slate-100 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
