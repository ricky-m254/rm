import { useState } from 'react'
import {
  Users, BookOpen, DollarSign, UserX, Calendar,
  Send, CheckCircle2, AlertTriangle, Phone, Mail,
  GraduationCap, Loader2, MessageSquare,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type ChannelType = 'both' | 'email' | 'sms'

interface SendLog { type: string; channel: ChannelType; success: boolean; message: string; time: string }

const ACTION_CONFIGS = [
  {
    key: 'report-card',
    label: 'Report Card Notification',
    description: 'Notify parents that end-of-term report cards are ready for collection.',
    icon: BookOpen,
    color: 'violet',
    gradient: 'from-violet-500/20 via-violet-500/5 to-transparent',
    border: 'border-violet-500/25',
    badgeBg: 'bg-violet-500/10',
    badgeColor: 'text-violet-400',
    endpoint: '/communication/parent/report-card-notify/',
    defaultSubject: 'Report Cards Ready for Collection — St. Mary\'s Nairobi High School',
    defaultMessage: 'Dear Parent/Guardian,\n\nThe end of term report cards for Term 1, 2025 are now ready for collection from the school office.\n\nOffice hours: Monday – Friday, 8:00 AM – 4:00 PM.\n\nPlease carry your national ID when collecting.\n\nSt. Mary\'s Nairobi High School',
  },
  {
    key: 'fee-reminder',
    label: 'Fee Reminder',
    description: 'Send fee payment reminders including outstanding balance details.',
    icon: DollarSign,
    color: 'emerald',
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    border: 'border-emerald-500/25',
    badgeBg: 'bg-emerald-500/10',
    badgeColor: 'text-emerald-400',
    endpoint: '/communication/parent/fee-reminder/',
    defaultSubject: 'Fee Payment Reminder — Term 1 2025',
    defaultMessage: 'Dear Parent/Guardian,\n\nThis is a reminder that school fees for Term 1, 2025 are due for payment by 14th February 2025.\n\nFee structure:\n• Tuition: Ksh 12,000\n• Boarding: Ksh 15,000\n• Activity Fee: Ksh 2,500\n• Lunch: Ksh 3,500\n• ICT Levy: Ksh 1,500\n• Games & Sports: Ksh 1,000\n\nTotal: Ksh 36,000\n\nPayment methods: M-Pesa Paybill 522200 (Acc: Admission No.), Bank, or Cash at Bursar\'s Office.\n\nContact: 0722 000 000 or bursar@stmarysnairobi.ac.ke\n\nSt. Mary\'s Nairobi High School',
  },
  {
    key: 'attendance-alert',
    label: 'Attendance Alert',
    description: 'Alert parents when a student has been recorded absent or late.',
    icon: UserX,
    color: 'amber',
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    border: 'border-amber-500/25',
    badgeBg: 'bg-amber-500/10',
    badgeColor: 'text-amber-400',
    endpoint: '/communication/parent/attendance-alert/',
    defaultSubject: 'Attendance Alert — St. Mary\'s Nairobi High School',
    defaultMessage: 'Dear Parent/Guardian,\n\nThis is to inform you that your child was absent from school today without prior notice.\n\nPlease contact the school as soon as possible to explain the absence.\n\nContact: 0722 000 000\n\nSt. Mary\'s Nairobi High School',
  },
  {
    key: 'meeting-invite',
    label: 'Meeting Invitation',
    description: 'Send invitations to parents for scheduled meetings or events.',
    icon: Calendar,
    color: 'cyan',
    gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
    border: 'border-cyan-500/25',
    badgeBg: 'bg-cyan-500/10',
    badgeColor: 'text-cyan-400',
    endpoint: '/communication/parent/meeting-invite/',
    defaultSubject: 'Parents\' Meeting Invitation — St. Mary\'s Nairobi High School',
    defaultMessage: 'Dear Parent/Guardian,\n\nYou are cordially invited to the Annual Parents\' and Guardians\' Meeting.\n\nDate: Saturday, 15th February 2025\nTime: 9:00 AM – 12:00 PM\nVenue: School Main Hall\n\nAgenda:\n• Academic performance review\n• Fee structure update\n• School developments and programs\n• Any Other Business\n\nLight refreshments will be provided. Please RSVP by 12th February 2025.\n\nYours faithfully,\nThe Principal\nSt. Mary\'s Nairobi High School',
  },
]

export default function CommunicationParentPage() {
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [emails, setEmails] = useState('')
  const [phones, setPhones] = useState('')
  const [subjects, setSubjects] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [channel, setChannel] = useState<ChannelType>('both')
  const [loading, setLoading] = useState<string | null>(null)
  const [logs, setLogs] = useState<SendLog[]>([])
  const [error, setError] = useState<string | null>(null)

  const getSubject = (key: string) => subjects[key] ?? (ACTION_CONFIGS.find(a => a.key === key)?.defaultSubject ?? '')
  const getMessage = (key: string) => messages[key] ?? (ACTION_CONFIGS.find(a => a.key === key)?.defaultMessage ?? '')

  const send = async (cfg: typeof ACTION_CONFIGS[0]) => {
    const emailList = emails.split(',').map(v => v.trim()).filter(Boolean)
    const phoneList = phones.split(',').map(v => v.trim()).filter(Boolean)
    if (emailList.length === 0 && phoneList.length === 0) { setError('Enter at least one email or phone number.'); return }
    setLoading(cfg.key)
    setError(null)
    try {
      await apiClient.post(cfg.endpoint, {
        emails: emailList,
        phones: phoneList,
        subject: getSubject(cfg.key),
        message: getMessage(cfg.key),
      })
      setLogs(prev => [{
        type: cfg.label,
        channel,
        success: true,
        message: `Sent to ${emailList.length} email(s) and ${phoneList.length} phone(s)`,
        time: new Date().toLocaleTimeString('en-KE'),
      }, ...prev.slice(0, 9)])
    } catch {
      setLogs(prev => [{
        type: cfg.label, channel, success: false,
        message: 'Failed — check communication settings',
        time: new Date().toLocaleTimeString('en-KE'),
      }, ...prev.slice(0, 9)])
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <PageHero
        badge="COMMUNICATION"
        badgeColor="rose"
        title="Parent Broadcasts"
        subtitle="Mass messages and announcements to parents"
        icon="📣"
      />
      {/* Header */}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Recipients */}
      <div className="rounded-2xl glass-panel p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Users size={14} className="text-slate-400" /> Recipients
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5">
            <Mail size={13} className="text-slate-500 flex-shrink-0" />
            <input
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Email addresses, comma-separated"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5">
            <Phone size={13} className="text-slate-500 flex-shrink-0" />
            <input
              value={phones}
              onChange={(e) => setPhones(e.target.value)}
              placeholder="Phone numbers, comma-separated"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1 w-fit">
          {([['both', 'Email + SMS'], ['email', 'Email Only'], ['sms', 'SMS Only']] as [ChannelType, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setChannel(v)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${channel === v ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {ACTION_CONFIGS.map((cfg) => {
          const Icon = cfg.icon
          const isActive = activeAction === cfg.key
          return (
            <div
              key={cfg.key}
              className={`rounded-2xl border glass-panel overflow-hidden transition-all ${isActive ? `border-${cfg.color}-500/30` : 'border-white/[0.07]'}`}
            >
              <button
                onClick={() => setActiveAction(isActive ? null : cfg.key)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition"
              >
                <div className={`flex-shrink-0 rounded-xl p-2.5 ${cfg.badgeBg} border ${cfg.border}`}>
                  <Icon size={16} className={cfg.badgeColor} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{cfg.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{cfg.description}</p>
                </div>
                <GraduationCap size={13} className={`flex-shrink-0 ${isActive ? cfg.badgeColor : 'text-slate-600'}`} />
              </button>

              {isActive && (
                <div className="border-t border-white/[0.07] p-4 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Subject</label>
                    <input
                      value={getSubject(cfg.key)}
                      onChange={(e) => setSubjects(s => ({ ...s, [cfg.key]: e.target.value }))}
                      className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Message</label>
                    <textarea
                      value={getMessage(cfg.key)}
                      onChange={(e) => setMessages(m => ({ ...m, [cfg.key]: e.target.value }))}
                      rows={6}
                      className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                    />
                  </div>
                  <button
                    onClick={() => send(cfg)}
                    disabled={loading === cfg.key}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 ${cfg.badgeBg} border ${cfg.border} hover:opacity-90`}
                  >
                    {loading === cfg.key ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {loading === cfg.key ? 'Sending…' : `Send ${cfg.label}`}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Send Log */}
      {logs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <MessageSquare size={14} className="text-slate-400" /> Send History
          </h2>
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${log.success ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                {log.success ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" /> : <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200">{log.type}</p>
                  <p className="text-[11px] text-slate-400">{log.message}</p>
                </div>
                <span className="text-[10px] text-slate-600 flex-shrink-0">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
