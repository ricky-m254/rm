import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Subject = { id: number; name: string }
type Resource = { id: number; title: string; resource_type: string; subject: number; subject_name?: string; external_url: string; description: string; created_at: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

const RESOURCE_TYPES = ['Document', 'Video', 'Image', 'Audio', 'Link', 'Other']

export default function CurriculumResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [resourceType, setResourceType] = useState('Link')
  const [subjectId, setSubjectId] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [rRes, sRes] = await Promise.all([
        apiClient.get<Resource[] | { results: Resource[] }>('/curriculum/resources/'),
        apiClient.get<Subject[] | { results: Subject[] }>('/academics/subjects/'),
      ])
      setResources(asArray(rRes.data)); setSubjects(asArray(sRes.data))
    } catch { setError('Unable to load resources.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!title.trim() || !subjectId) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/curriculum/resources/', { title: title.trim(), resource_type: resourceType, subject: Number(subjectId), external_url: externalUrl, description })
      setTitle(''); setExternalUrl(''); setDescription(''); setNotice('Resource added.')
      await load()
    } catch { setError('Unable to add resource.') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/curriculum/resources/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete resource.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ACADEMICS"
        badgeColor="emerald"
        title="Curriculum Resources"
        subtitle="Schemes of work, lesson notes and materials"
        icon="📖"
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <div className="rounded-2xl glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">Add Resource</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <select value={resourceType} onChange={e => setResourceType(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            {RESOURCE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option value="">Subject *</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="URL (for links/videos)" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2 lg:col-span-3" />
        </div>
        <button onClick={save} disabled={saving || !title.trim() || !subjectId} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Add Resource'}</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? <p className="col-span-3 text-sm text-slate-400">Loading…</p> : resources.map(r => (
          <div key={r.id} className="rounded-xl glass-panel p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-100">{r.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">{r.subject_name}</p>
                <span className="mt-1 inline-block rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-300">{r.resource_type}</span>
              </div>
              <button onClick={() => setDeleteTarget(r)} className="text-xs font-semibold text-rose-400 hover:text-rose-300 shrink-0">Delete</button>
            </div>
            {r.description ? <p className="mt-2 text-xs text-slate-400 line-clamp-2">{r.description}</p> : null}
            {r.external_url ? <a href={r.external_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-emerald-400 hover:text-emerald-300 underline">Open Link</a> : null}
          </div>
        ))}
        {!loading && resources.length === 0 ? <p className="col-span-3 text-sm text-slate-500">No resources yet.</p> : null}
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Resource" description={`Delete "${deleteTarget?.title}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
