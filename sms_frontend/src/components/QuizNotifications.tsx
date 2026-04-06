import { useState, useEffect, useRef } from 'react'
import { Bell, X, Clock, AlertCircle, Trophy, BookOpen, Zap, Calendar } from 'lucide-react'
import { apiClient } from '../api/client'

interface Quiz {
  id: number
  title: string
  is_published: boolean
  due_date: string | null
  question_count: number
  course_name?: string
  subject_name?: string
  created_at: string
}

interface Notification {
  id: string
  type: 'new_quiz' | 'due_soon' | 'overdue' | 'holiday_assessment' | 'result'
  title: string
  message: string
  quizId?: number
  timestamp: Date
  read: boolean
  priority: 'high' | 'normal' | 'low'
}

const TYPE_CONFIG = {
  new_quiz:           { icon: Zap,          color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  label: 'New Quiz' },
  due_soon:           { icon: Clock,         color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Due Soon' },
  overdue:            { icon: AlertCircle,   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'Overdue' },
  holiday_assessment: { icon: Calendar,      color: '#10b981', bg: 'rgba(16,185,129,0.12)',  label: 'Holiday' },
  result:             { icon: Trophy,        color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'Result' },
}

function buildNotifications(quizzes: Quiz[]): Notification[] {
  const now = new Date()
  const notifications: Notification[] = []

  quizzes.forEach(q => {
    const createdAt = new Date(q.created_at)
    const isRecent = (now.getTime() - createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000

    if (q.is_published && isRecent) {
      const isHoliday = q.title.toLowerCase().includes('holiday') ||
        q.title.toLowerCase().includes('vacation') ||
        q.title.toLowerCase().includes('break') ||
        (q.course_name ?? '').toLowerCase().includes('holiday')

      notifications.push({
        id: `new_${q.id}`,
        type: isHoliday ? 'holiday_assessment' : 'new_quiz',
        title: isHoliday ? 'Holiday Assessment Available' : 'New Quiz Published',
        message: `${q.subject_name ?? q.course_name ?? 'A quiz'}: "${q.title}" is now available${q.question_count > 0 ? ` (${q.question_count} questions)` : ''}.`,
        quizId: q.id,
        timestamp: createdAt,
        read: false,
        priority: isHoliday ? 'high' : 'normal',
      })
    }

    if (q.due_date && q.is_published) {
      const due = new Date(q.due_date)
      const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (hoursUntilDue < 0) {
        notifications.push({
          id: `overdue_${q.id}`,
          type: 'overdue',
          title: 'Quiz Overdue',
          message: `"${q.title}" was due ${Math.abs(Math.ceil(hoursUntilDue))}h ago. Contact your teacher if you missed it.`,
          quizId: q.id,
          timestamp: due,
          read: false,
          priority: 'high',
        })
      } else if (hoursUntilDue < 48) {
        notifications.push({
          id: `due_${q.id}`,
          type: 'due_soon',
          title: `Due in ${Math.ceil(hoursUntilDue)}h`,
          message: `"${q.title}" deadline is ${due.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. Don't miss it!`,
          quizId: q.id,
          timestamp: due,
          read: false,
          priority: 'high',
        })
      }
    }
  })

  return notifications.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1
    if (b.priority === 'high' && a.priority !== 'high') return 1
    return b.timestamp.getTime() - a.timestamp.getTime()
  })
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

interface QuizNotificationsProps {
  onNavigateToQuiz?: (quizId: number) => void
}

export default function QuizNotifications({ onNavigateToQuiz }: QuizNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiClient.get('/elearning/quizzes/')
      .then(r => {
        const data = r.data
        const quizzes: Quiz[] = Array.isArray(data) ? data : data.results ?? []
        setNotifications(buildNotifications(quizzes))
      })
      .catch(() => setNotifications([]))
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unread = notifications.filter(n => !readIds.has(n.id))
  const unreadCount = unread.length

  const markAllRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)))
  }

  const markRead = (id: string) => {
    setReadIds(prev => new Set([...prev, id]))
  }

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/10"
        title="Quiz Notifications"
      >
        <Bell size={15} className={unreadCount > 0 ? 'text-emerald-400' : 'text-slate-500'} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold flex items-center justify-center leading-none"
            style={{ background: '#ef4444', color: '#fff', padding: '0 3px' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 w-80 rounded-2xl shadow-2xl z-[100] overflow-hidden"
          style={{ background: '#0d1526', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)' }}>
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-emerald-400" />
              <p className="text-sm font-bold text-white">Quiz Alerts</p>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-slate-400 transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2">
                <BookOpen size={24} className="text-slate-700" />
                <p className="text-xs text-slate-600">No quiz notifications</p>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type]
                const Icon = cfg.icon
                const isRead = readIds.has(n.id)
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isRead ? 'transparent' : 'rgba(99,102,241,0.03)',
                    }}
                    onClick={() => {
                      markRead(n.id)
                      if (n.quizId && onNavigateToQuiz) onNavigateToQuiz(n.quizId)
                      setOpen(false)
                    }}
                  >
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: cfg.bg }}>
                      <Icon size={12} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[11px] font-bold" style={{ color: isRead ? '#64748b' : '#e2e8f0' }}>{n.title}</p>
                        <button
                          onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                          className="text-slate-700 hover:text-slate-500 transition-colors flex-shrink-0"
                        >
                          <X size={10} />
                        </button>
                      </div>
                      <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: isRead ? '#475569' : '#94a3b8' }}>
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                          style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        <span className="text-[9px] text-slate-600">{timeAgo(n.timestamp)}</span>
                        {n.priority === 'high' && !isRead && (
                          <span className="text-[9px] font-bold text-rose-400">Urgent</span>
                        )}
                      </div>
                    </div>
                    {!isRead && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div className="px-4 py-2 text-[10px] text-slate-600 text-center"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            Alerts for published quizzes, due dates & holiday assessments
          </div>
        </div>
      )}
    </div>
  )
}
