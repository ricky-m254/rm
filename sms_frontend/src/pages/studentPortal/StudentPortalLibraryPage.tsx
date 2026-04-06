import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { BookOpen, Search, Clock, CheckCircle, AlertCircle, Book } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type LibraryResource = {
  id: number
  title: string
  author: string
  isbn: string
  category_name?: string
  available_copies: number
  total_copies: number
  cover_image?: string
  resource_type?: string
}

type BorrowedBook = {
  id: number
  resource_title: string
  borrow_date: string
  due_date: string
  return_date?: string
  status: string
}

type LibraryStats = {
  available_resources: number
  currently_borrowed: number
  overdue: number
  due_soon: number
}

type LibraryPayload = {
  stats: LibraryStats
  resources: LibraryResource[]
  borrowed: BorrowedBook[]
}

function daysBetween(date: string) {
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function StudentPortalLibraryPage() {
  const [stats, setStats] = useState<LibraryStats>({
    available_resources: 0,
    currently_borrowed: 0,
    overdue: 0,
    due_soon: 0,
  })
  const [resources, setResources] = useState<LibraryResource[]>([])
  const [borrowed, setBorrowed] = useState<BorrowedBook[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'catalog' | 'borrowed'>('catalog')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get<LibraryPayload>('/student-portal/library/')
        setStats(response.data.stats ?? {
          available_resources: 0,
          currently_borrowed: 0,
          overdue: 0,
          due_soon: 0,
        })
        setResources(response.data.resources ?? [])
        setBorrowed(response.data.borrowed ?? [])
      } catch {
        setStats({
          available_resources: 0,
          currently_borrowed: 0,
          overdue: 0,
          due_soon: 0,
        })
        setResources([])
        setBorrowed([])
      }
      setLoading(false)
    }
    void load()
  }, [])

  const filteredResources = resources.filter(r => {
    const q = search.toLowerCase()
    return !q || r.title.toLowerCase().includes(q) || r.author.toLowerCase().includes(q) || (r.category_name ?? '').toLowerCase().includes(q)
  })

  const overdue = borrowed.filter(b => !b.return_date && daysBetween(b.due_date) < 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl px-6 py-7 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f1d2e 0%, #1a2e4a 60%, #0d1e35 100%)' }}>
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(14,165,233,0.5) 0%, transparent 60%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(14,165,233,0.2)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.3)' }}>
              LIBRARY
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white">School Library</h1>
          <p className="text-sm text-slate-400 mt-1">Search books, digital resources and manage your borrowings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Books Available', value: stats.available_resources, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', icon: Book },
          { label: 'Currently Borrowed', value: stats.currently_borrowed, color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: BookOpen },
          { label: 'Overdue', value: stats.overdue, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: AlertCircle },
          { label: 'Due This Week', value: stats.due_soon, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={{ background: k.bg, border: `1px solid ${k.color}25` }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-400">{k.label}</p>
              <k.icon size={13} style={{ color: k.color }} />
            </div>
            <p className="text-xl font-bold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle size={16} className="text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300">
            You have <strong>{overdue.length}</strong> overdue book{overdue.length > 1 ? 's' : ''}. Please return them to avoid fines.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {([
          { key: 'catalog', label: 'Book Catalog' },
          { key: 'borrowed', label: `My Borrowings (${borrowed.filter(b => !b.return_date).length})` },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition"
            style={{
              background: tab === t.key ? 'rgba(14,165,233,0.15)' : 'transparent',
              color: tab === t.key ? '#38bdf8' : '#64748b',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Catalog tab */}
      {tab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Search size={14} className="text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, author or category…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
            />
          </div>

          {loading ? (
            <p className="text-center text-slate-500 py-10">Loading catalog…</p>
          ) : filteredResources.length === 0 ? (
            <p className="text-center text-slate-500 py-10">No books found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredResources.map(r => (
                <div key={r.id} className="rounded-2xl p-4 flex gap-3 transition-all hover:scale-[1.01]" style={GLASS}>
                  <div className="w-12 h-16 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                    <Book size={20} className="text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{r.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{r.author || 'Unknown author'}</p>
                    {r.category_name && (
                      <span className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-sky-400"
                        style={{ background: 'rgba(14,165,233,0.1)' }}>
                        {r.category_name}
                      </span>
                    )}
                    <div className="mt-2 flex items-center gap-1.5">
                      {r.available_copies > 0 ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                          <CheckCircle size={10} /> {r.available_copies} available
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-400">All borrowed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Borrowings tab */}
      {tab === 'borrowed' && (
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-slate-500 py-10">Loading…</p>
          ) : borrowed.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen size={32} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">You have no borrowing history.</p>
            </div>
          ) : borrowed.map(b => {
            const isOverdue = !b.return_date && daysBetween(b.due_date) < 0
            const dueIn = daysBetween(b.due_date)
            return (
              <div key={b.id} className="rounded-2xl p-4 flex items-center justify-between gap-4"
                style={{
                  background: isOverdue ? 'rgba(239,68,68,0.07)' : GLASS.background,
                  border: isOverdue ? '1px solid rgba(239,68,68,0.25)' : GLASS.border,
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(14,165,233,0.1)' }}>
                    <BookOpen size={16} style={{ color: isOverdue ? '#ef4444' : '#0ea5e9' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{b.resource_title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Borrowed {new Date(b.borrow_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                      {' · '}Due {new Date(b.due_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {b.return_date ? (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={10} /> Returned
                    </span>
                  ) : isOverdue ? (
                    <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                      <AlertCircle size={10} /> {Math.abs(dueIn)}d overdue
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                      <Clock size={10} /> Due in {dueIn}d
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
