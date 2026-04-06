import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type UploadedDoc = {
  id: number
  name: string
  url: string
  uploaded_at?: string
}

type StudentDocRow = {
  id: number
  student_id: number
  student_name: string
  admission_number?: string
  file_name: string
  url: string
  uploaded_at?: string
}

type StudentWithDocs = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
  uploaded_documents?: UploadedDoc[]
}

export default function StudentsDocumentsPage() {
  const [documents, setDocuments] = useState<StudentDocRow[]>([])
  const [students, setStudents] = useState<StudentWithDocs[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [search, setSearch] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentDocRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [formState, setFormState] = useState({
    student: '',
    files: [] as File[],
  })

  useEffect(() => {
    let isMounted = true
    const loadDocuments = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [docsRes, studentsRes] = await Promise.all([
          apiClient.get<StudentDocRow[] | { results: StudentDocRow[]; count: number }>(
            '/students/documents/',
            {
              params: {
                page,
                page_size: pageSize,
                search: search.trim() || undefined,
                student: studentFilter || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
              },
            },
          ),
          apiClient.get<StudentWithDocs[] | { results: StudentWithDocs[]; count: number }>(
            '/students/',
            { params: { page_size: 200 } },
          ),
        ])
        if (!isMounted) return
        const normalizedDocs = normalizePaginatedResponse(docsRes.data)
        setDocuments(normalizedDocs.items)
        setTotalCount(normalizedDocs.totalCount)
        setIsServerPaginated(normalizedDocs.isPaginated)
        setStudents(normalizePaginatedResponse(studentsRes.data).items)
      } catch {
        if (!isMounted) return
        setError('Unable to load student documents.')
        setDocuments([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadDocuments()
    return () => {
      isMounted = false
    }
  }, [refreshKey, page])

  const handleUpload = async () => {
    setFormError(null)
    if (!formState.student || formState.files.length === 0) {
      setFormError('Select a student and at least one document.')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formState.files.forEach((file) => formData.append('documents', file))
      await apiClient.post(`/students/${formState.student}/documents/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setIsFormOpen(false)
      setFormState({ student: '', files: [] })
      setRefreshKey((prev) => prev + 1)
    } catch {
      setFormError('Unable to upload documents.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setError(null)
    setIsDeleting(true)
    try {
      await apiClient.delete(`/students/${deleteTarget.student_id}/documents/${deleteTarget.id}/`)
      setDeleteTarget(null)
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to delete document.'))
    } finally {
      setIsDeleting(false)
    }
  }

  const sortedDocuments = useMemo(
    () => documents.slice().sort((a, b) => (b.uploaded_at || '').localeCompare(a.uploaded_at || '')),
    [documents],
  )

  const totalPages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : sortedDocuments.length) / pageSize),
  )

  const handleDownload = async (format: 'csv' | 'pdf') => {
    setDownloadError(null)
    setIsDownloading(true)
    try {
      const response = await apiClient.get(`/students/documents/export/${format}/`, {
        responseType: 'blob',
        params: {
          search: search.trim() || undefined,
          student: studentFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      })
      const defaultName = format === 'csv' ? 'students_documents_report.csv' : 'students_documents_report.pdf'
      downloadFromResponse(response as { data: Blob; headers?: Record<string, unknown> }, defaultName)
    } catch (err) {
      setDownloadError(extractApiErrorMessage(err, `Unable to export ${format.toUpperCase()} documents report.`))
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Documents"
        subtitle="Student document storage and downloads."
        icon="📋"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading documents...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
          {error}
        </div>
      ) : null}

      {downloadError ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
          {downloadError}
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-semibold">Student documents</h2>
            <p className="mt-1 text-sm text-slate-400">Files uploaded to student profiles.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search student or file"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <input
              type="date"
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <input
              type="date"
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={studentFilter}
              onChange={(event) => setStudentFilter(event.target.value)}
            >
              <option value="">All students</option>
              {students.map((student) => (
                <option key={student.id} value={String(student.id)}>
                  {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              onClick={() => {
                setPage(1)
                setRefreshKey((prev) => prev + 1)
              }}
            >
              Filter
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              onClick={() => {
                setSearch('')
                setStudentFilter('')
                setDateFrom('')
                setDateTo('')
                setPage(1)
                setRefreshKey((prev) => prev + 1)
              }}
            >
              Reset
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-60"
              disabled={isDownloading}
              onClick={() => handleDownload('csv')}
            >
              Download CSV
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-60"
              disabled={isDownloading}
              onClick={() => handleDownload('pdf')}
            >
              Download PDF
            </button>
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={() => {
                setIsFormOpen(true)
                setFormError(null)
              }}
            >
              Upload document
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Admission #</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedDocuments.map((row) => (
                <tr key={row.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">{row.student_name}</td>
                  <td className="px-4 py-3">{row.admission_number ?? '--'}</td>
                  <td className="px-4 py-3">
                    <a
                      className="text-emerald-200 underline"
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {row.file_name}
                    </a>
                  </td>
                  <td className="px-4 py-3">{row.uploaded_at ?? '--'}</td>
                  <td className="px-4 py-3">
                    <button
                      className="text-xs text-rose-200"
                      onClick={() => setDeleteTarget(row)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {sortedDocuments.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                    No documents uploaded.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.07] bg-slate-950 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Documents</p>
                <h3 className="text-lg font-display font-semibold">Upload documents</h3>
              </div>
              <button
                className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200"
                onClick={() => setIsFormOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              <label className="block text-sm">
                Student
                <select
                  className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                  value={formState.student}
                  onChange={(event) => setFormState((prev) => ({ ...prev, student: event.target.value }))}
                >
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.admission_number} - {student.first_name} {student.last_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Documents
                <input
                  type="file"
                  multiple
                  className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-xs text-slate-200"
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      files: Array.from(event.target.files ?? []),
                    }))
                  }
                />
              </label>
            </div>

            {formError ? <p className="mt-4 text-xs text-rose-300">{formError}</p> : null}
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900"
                onClick={handleUpload}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Document"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.file_name}" for ${deleteTarget.student_name}? This cannot be undone.`
            : 'Delete this document?'
        }
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null)
        }}
        onConfirm={() => void handleDelete()}
        isProcessing={isDeleting}
      />
    </div>
  )
}
