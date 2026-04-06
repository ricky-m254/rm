import { useEffect, useRef, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PrintButton from '../../components/PrintButton'
import { CheckCircle2, Clock, FileText, Printer, Upload, X, XCircle } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { resolveFileUrl } from '../../api/baseUrl'

interface Session { id: number; name: string }
interface Subject { id: number; name: string }
interface SchoolClass { id: number; display_name: string; name: string }
interface PaperUpload {
  id: number
  session: number; session_name: string
  subject: number; subject_name: string
  school_class: number; class_name: string
  uploaded_by: number; uploaded_by_name: string
  filename_original: string
  status: string; status_display: string
  print_copies: number
  notes: string
  reviewed_by_name: string
  reviewed_at: string | null
  file_url: string | null
  created_at: string
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:  { label: 'Pending Review', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/30', icon: Clock },
  approved: { label: 'Approved for Print', color: 'text-sky-300', bg: 'bg-sky-500/10 border-sky-500/30', icon: CheckCircle2 },
  printed:  { label: 'Printed', color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: Printer },
  rejected: { label: 'Rejected', color: 'text-rose-300', bg: 'bg-rose-500/10 border-rose-500/30', icon: XCircle },
}

export default function ExaminationsPaperUploadsPage() {
  const [uploads, setUploads] = useState<PaperUpload[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [filterSession, setFilterSession] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [showUploadForm, setShowUploadForm] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [classId, setClassId] = useState('')
  const [printCopies, setPrintCopies] = useState('1')
  const [uploadNotes, setUploadNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [reviewTarget, setReviewTarget] = useState<PaperUpload | null>(null)
  const [reviewStatus, setReviewStatus] = useState<string>('approved')
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewing, setReviewing] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<PaperUpload | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSession) params.set('session', filterSession)
      if (filterStatus) params.set('status', filterStatus)
      const [rU, rS, rX, rC] = await Promise.all([
        apiClient.get<PaperUpload[] | { results: PaperUpload[] }>(`/examinations/paper-uploads/?${params}`),
        apiClient.get<Session[] | { results: Session[] }>('/examinations/sessions/'),
        apiClient.get<Subject[] | { results: Subject[] }>('/academics/subjects/'),
        apiClient.get<SchoolClass[] | { results: SchoolClass[] }>('/academics/classes/'),
      ])
      setUploads(asArray(rU.data))
      setSessions(asArray(rS.data))
      setSubjects(asArray(rX.data))
      setClasses(asArray(rC.data).map((c: any) => ({ ...c, display_name: c.display_name || c.name })))
    } catch { setError('Unable to load exam paper uploads.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [filterSession, filterStatus])

  const handleUpload = async () => {
    if (!file || !sessionId || !subjectId || !classId) {
      setError('Session, subject, class and file are required.'); return
    }
    setSaving(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('session', sessionId)
      fd.append('subject', subjectId)
      fd.append('school_class', classId)
      fd.append('print_copies', printCopies)
      fd.append('notes', uploadNotes)
      fd.append('file', file)
      await apiClient.post('/examinations/paper-uploads/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setNotice('Exam paper uploaded and forwarded to secretary for printing.')
      setShowUploadForm(false); setFile(null); setSessionId(''); setSubjectId(''); setClassId(''); setPrintCopies('1'); setUploadNotes('')
      await load()
    } catch { setError('Upload failed. Check file size or permissions.') }
    finally { setSaving(false) }
  }

  const handleReview = async () => {
    if (!reviewTarget) return
    setReviewing(true)
    try {
      await apiClient.patch(`/examinations/paper-uploads/${reviewTarget.id}/review/`, {
        status: reviewStatus, notes: reviewNotes,
      })
      setNotice(`Paper marked as "${STATUS_CONFIG[reviewStatus]?.label}".`)
      setReviewTarget(null)
      await load()
    } catch { setError('Failed to update status.') }
    finally { setReviewing(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await apiClient.delete(`/examinations/paper-uploads/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setError('Failed to delete upload.') }
    finally { setDeleting(false) }
  }

  const counts = {
    pending: uploads.filter(u => u.status === 'pending').length,
    approved: uploads.filter(u => u.status === 'approved').length,
    printed: uploads.filter(u => u.status === 'printed').length,
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="EXAMINATIONS"
        badgeColor="amber"
        title="Paper Uploads"
        subtitle="Upload and manage examination question papers"
        icon="📝"
      />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Exam Paper Uploads</h1>
          <p className="mt-1 text-sm text-slate-400">Teachers upload exam papers here — secretary reviews and manages printing.</p>
        </div>
        <div className="flex gap-2">
          <PrintButton printId="uploads-print-area" label="Print Queue" title="Exam Paper Print Queue" />
          <button onClick={() => { setShowUploadForm(s => !s); setError(null) }}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 text-sm transition">
            {showUploadForm ? 'Cancel' : '+ Upload Exam Paper'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending Review', value: counts.pending, color: 'text-amber-300' },
          { label: 'Approved for Print', value: counts.approved, color: 'text-sky-300' },
          { label: 'Printed', value: counts.printed, color: 'text-emerald-300' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl glass-panel p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">{s.label}</p>
            <p className={`mt-1.5 text-3xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="rounded-2xl border border-white/[0.09] glass-panel p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Upload Exam Paper</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Exam Session *</label>
              <select value={sessionId} onChange={e => setSessionId(e.target.value)} className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-100">
                <option value="">Select session</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Subject *</label>
              <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-100">
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Class *</label>
              <select value={classId} onChange={e => setClassId(e.target.value)} className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-100">
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Print Copies Needed</label>
              <input type="number" min={1} value={printCopies} onChange={e => setPrintCopies(e.target.value)}
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes for Secretary</label>
              <input value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} placeholder="e.g. Print both sides, confidential"
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Exam Paper File * (PDF, DOC, DOCX)</label>
            <div className="flex items-center gap-3">
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:border-emerald-400 transition">
                <Upload className="h-4 w-4" /> Choose File
              </button>
              {file && <span className="text-xs text-emerald-400">{file.name}</span>}
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => void handleUpload()} disabled={saving}
              className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 hover:bg-emerald-400 transition">
              {saving ? 'Uploading...' : 'Upload & Forward to Secretary'}
            </button>
            <button onClick={() => setShowUploadForm(false)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterSession} onChange={e => setFilterSession(e.target.value)}
          className="rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
          <option value="">All Sessions</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
          <option value="">All Statuses</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved for Print</option>
          <option value="printed">Printed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Print area */}
      <div id="uploads-print-area" className="hidden">
        <div className="print-header">
          <h1>Exam Paper Print Queue</h1>
          <p>Generated: {new Date().toLocaleDateString('en-KE')}</p>
        </div>
        <table>
          <thead><tr><th>Subject</th><th>Class</th><th>Session</th><th>Uploaded By</th><th>Copies</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>
            {uploads.map(u => (
              <tr key={u.id}>
                <td>{u.subject_name}</td><td>{u.class_name}</td><td>{u.session_name}</td>
                <td>{u.uploaded_by_name}</td><td>{u.print_copies}</td>
                <td><span className="badge">{u.status_display}</span></td><td>{u.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 animate-pulse">Loading...</div>
      ) : uploads.length === 0 ? (
        <div className="py-20 text-center text-slate-500 rounded-2xl border border-dashed border-white/[0.07]">No exam paper uploads found.</div>
      ) : (
        <div className="rounded-2xl glass-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.09] text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Subject / Class</th>
                <th className="px-4 py-3 text-left">Session</th>
                <th className="px-4 py-3 text-left">Uploaded By</th>
                <th className="px-4 py-3 text-center">Copies</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">File</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {uploads.map(u => {
                const cfg = STATUS_CONFIG[u.status] ?? STATUS_CONFIG.pending
                const Icon = cfg.icon
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-100">{u.subject_name}</p>
                      <p className="text-xs text-slate-500">{u.class_name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{u.session_name}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-200 text-xs">{u.uploaded_by_name}</p>
                      <p className="text-slate-600 text-[10px]">{new Date(u.created_at).toLocaleDateString('en-KE')}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-200">{u.print_copies}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                        <Icon className="h-3 w-3" />{cfg.label}
                      </span>
                      {u.notes && <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs truncate">{u.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {u.file_url
                        ? <a href={resolveFileUrl(u.file_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
                            <FileText className="h-3.5 w-3.5" /> {u.filename_original || 'Download'}
                          </a>
                        : <span className="text-slate-600 text-xs">No file</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {(u.status === 'pending' || u.status === 'approved') && (
                          <button onClick={() => { setReviewTarget(u); setReviewStatus(u.status === 'pending' ? 'approved' : 'printed'); setReviewNotes(u.notes || '') }}
                            className="text-xs text-sky-400 hover:text-sky-300 transition">Review</button>
                        )}
                        <button onClick={() => setDeleteTarget(u)} className="text-xs text-rose-400 hover:text-rose-300 transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">Review Upload</h2>
              <button onClick={() => setReviewTarget(null)} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs text-slate-400 space-y-1">
              <p><strong className="text-slate-200">{reviewTarget.subject_name}</strong> — {reviewTarget.class_name}</p>
              <p>Session: {reviewTarget.session_name}</p>
              <p>Uploaded by: {reviewTarget.uploaded_by_name} · Copies: {reviewTarget.print_copies}</p>
              {reviewTarget.file_url && (
                <a href={resolveFileUrl(reviewTarget.file_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-400 mt-1">
                  <FileText className="h-3 w-3" /> View File
                </a>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Update Status</label>
              <select value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}
                className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-100">
                <option value="approved">Approved for Print</option>
                <option value="printed">Printed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Secretary Notes</label>
              <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={2}
                className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-100 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => void handleReview()} disabled={reviewing}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 hover:bg-emerald-400 transition">
                {reviewing ? 'Saving...' : 'Save Status'}
              </button>
              <button onClick={() => setReviewTarget(null)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Upload" description={`Delete the uploaded paper for ${deleteTarget?.subject_name} — ${deleteTarget?.class_name}?`}
        confirmLabel="Delete" isProcessing={deleting} onConfirm={() => void handleDelete()} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
