import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { MessageSquare, Megaphone, Bell, CheckCircle2 } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

export default function ParentPortalCommunicationPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'notifications' | 'announcements' | 'messages'>('notifications')

  useEffect(() => {
    Promise.all([
      apiClient.get('/parent-portal/messages/'),
      apiClient.get('/parent-portal/announcements/'),
      apiClient.get('/parent-portal/notifications/'),
    ])
      .then(([m, a, n]) => {
        setMessages(Array.isArray(m.data) ? m.data : [])
        setAnnouncements(Array.isArray(a.data) ? a.data : [])
        setNotifications(Array.isArray(n.data) ? n.data : [])
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  const unreadNotifs = notifications.filter((n: any) => !n.is_read).length

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">COMMUNICATION</p>
        <h1 className="text-2xl font-display font-bold text-white">Communication</h1>
        <p className="text-slate-500 text-sm mt-1">Messages, school announcements, and notifications</p>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Notifications', value: notifications.length, unread: unreadNotifs, icon: Bell, color: '#a855f7' },
          { label: 'Announcements', value: announcements.length, unread: 0, icon: Megaphone, color: '#10b981' },
          { label: 'Messages', value: messages.length, unread: 0, icon: MessageSquare, color: '#38bdf8' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={GLASS}>
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={13} style={{ color: k.color }} />
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{k.label}</p>
            </div>
            <div className="flex items-end gap-1.5">
              <p className="text-2xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
              {k.unread > 0 && (
                <span className="mb-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/20 text-violet-300">{k.unread} new</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['notifications', 'announcements', 'messages'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition-all ${tab === t ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading…</div>
      ) : tab === 'notifications' ? (
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="rounded-2xl p-10 text-center text-sm text-slate-500" style={GLASS}>No notifications.</div>
          ) : notifications.map((n: any, i: number) => (
            <div key={n.id ?? i} className="rounded-xl p-4 flex items-start gap-3" style={{ ...GLASS, opacity: n.is_read ? 0.6 : 1 }}>
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.is_read ? '#475569' : '#a855f7' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{n.title || n.message || 'Notification'}</p>
                {n.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>}
                {n.created_at && <p className="text-[10px] text-slate-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>}
              </div>
              {n.is_read && <CheckCircle2 size={12} className="text-slate-600 flex-shrink-0 mt-1" />}
            </div>
          ))}
        </div>
      ) : tab === 'announcements' ? (
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="rounded-2xl p-10 text-center text-sm text-slate-500" style={GLASS}>No announcements.</div>
          ) : announcements.map((a: any, i: number) => (
            <div key={a.id ?? i} className="rounded-2xl p-5" style={GLASS}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
                  <Megaphone size={14} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-200">{a.title}</p>
                  {a.content && <p className="text-xs text-slate-400 mt-1 line-clamp-3">{a.content}</p>}
                  {a.created_at && <p className="text-[10px] text-slate-600 mt-2">{new Date(a.created_at).toLocaleDateString()}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="rounded-2xl p-10 text-center text-sm text-slate-500" style={GLASS}>No messages.</div>
          ) : messages.map((m: any, i: number) => (
            <div key={m.id ?? i} className="rounded-2xl p-5" style={GLASS}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(56,189,248,0.12)' }}>
                  <MessageSquare size={14} className="text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-200">{m.subject || 'Message'}</p>
                  {m.body && <p className="text-xs text-slate-400 mt-1 line-clamp-3">{m.body}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.status === 'READ' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {m.status || 'SENT'}
                    </span>
                    {m.created_at && <span className="text-[10px] text-slate-600">{new Date(m.created_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
