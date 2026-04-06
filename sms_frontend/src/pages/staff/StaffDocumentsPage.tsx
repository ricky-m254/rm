import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type StaffRow = { id: number; full_name: string; staff_id: string }
type DocumentRow = { id: number; staff: number; staff_name: string; title: string; document_type: string; verification_status: string; expiry_date: string | null; file: string; file_size: number; mime_type: string }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function StaffDocumentsPage() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [selectedStaff, setSelectedStaff] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState('Certificate')
  const [file, setFile] = useState<File | null>(null)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [expiring, setExpiring] = useState<DocumentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<DocumentRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    try {
      const staffRes = await apiClient.get<StaffRow[] | { results: StaffRow[] }>('/staff/')
      setStaff(asArray(staffRes.data))
    } catch { /* staff load failure is non-critical */ }

    try {
      const docsRes = await apiClient.get<DocumentRow[] | { results: DocumentRow[] }>('/staff/documents/')
      setDocuments(asArray(docsRes.data))
    } catch {
      setError('Unable to load documents.')
    }

    try {
      const expRes = await apiClient.get<DocumentRow[] | { results: DocumentRow[] }>('/staff/documents/expiring/')
      setExpiring(asArray(expRes.data))
    } catch { /* expiring load failure is non-critical */ }
  }

  useEffect(() => { void load() }, [])

  const upload = async () => {
    if (!selectedStaff || !title.trim() || !file) return
    setError(null); setNotice(null)
    try {
      const form = new FormData()
      form.append('staff', String(selectedStaff))
      form.append('title', title.trim())
      form.append('document_type', documentType)
      form.append('file', file)
      await apiClient.post('/staff/documents/', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setTitle(''); setFile(null); setNotice('Document uploaded.'); await load()
    } catch {
      setError('Unable to upload document.')
    }
  }

  const verify = async (id: number) => {
    setError(null)
    try { await apiClient.post(`/staff/documents/${id}/verify/`); await load() }
    catch { setError('Unable to verify document.') }
  }

  const download = async (id: number) => {
    try {
      const response = await apiClient.get(`/staff/documents/${id}/download/`, { responseType: 'blob' })
      downloadFromResponse(response as { data: Blob; headers?: Record<string, unknown> }, `staff_document_${id}`)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to download document.'))
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/staff/documents/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete document.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="STAFF"
        badgeColor="blue"
        title="Staff Documents"
        subtitle="Contracts, certificates and official documents"
        icon="👤"
      />
      <section className="rounded-2xl glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Documents</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Upload, Verify, and Track Expiring Records</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold">Upload Document</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option value="">Select staff</option>
            {staff.map((row) => <option key={row.id} value={row.id}>{row.staff_id} - {row.full_name}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option>Contract</option><option>Certificate</option><option>License</option><option>ID</option><option>Medical</option><option>Performance</option><option>Other</option>
          </select>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <button onClick={upload} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Upload</button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Documents ({documents.length})</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {documents.map((row) => {
              const rawFileName = row.file ? row.file.split('/').pop() ?? '' : ''
              const fileSizeKb = row.file_size ? (row.file_size / 1024).toFixed(1) + ' KB' : ''
              return (
                <div key={row.id} className="rounded-lg bg-slate-950/60 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-100 truncate">{row.title}</p>
                      <p className="text-slate-400 mt-0.5">{row.staff_name} · {row.document_type}</p>
                      {rawFileName ? (
                        <p className="text-slate-500 mt-0.5 truncate">
                          📎 {rawFileName}{fileSizeKb ? ` (${fileSizeKb})` : ''}
                        </p>
                      ) : null}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${row.verification_status === 'Verified' ? 'bg-emerald-500/10 text-emerald-400' : row.verification_status === 'Rejected' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {row.verification_status}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {row.verification_status !== 'Verified' ? (
                      <button onClick={() => verify(row.id)} className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs text-slate-200">Verify</button>
                    ) : null}
                    <button onClick={() => download(row.id)} className="rounded-lg border border-emerald-700/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">⬇ Download</button>
                    <button onClick={() => setDeleteTarget(row)} className="rounded-lg border border-rose-700/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-300">Delete</button>
                  </div>
                </div>
              )
            })}
            {documents.length === 0 ? <p className="text-slate-500">No documents uploaded.</p> : null}
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Expiring Soon</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {expiring.map((row) => (
              <div key={row.id} className="rounded-lg bg-slate-950/60 px-3 py-2">
                <p>{row.title}</p>
                <p className="text-slate-400">{row.staff_name} | Expiry: {row.expiry_date ?? 'N/A'}</p>
              </div>
            ))}
            {expiring.length === 0 ? <p className="text-slate-500">No documents expiring soon.</p> : null}
          </div>
        </article>
      </section>

      <ConfirmDialog open={!!deleteTarget} title="Delete Document" description={`Delete "${deleteTarget?.title}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
