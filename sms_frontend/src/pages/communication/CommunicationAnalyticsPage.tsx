import { useEffect, useState } from 'react'
import {
  BarChart2, MessageSquare, Mail, Phone, Bell,
  TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, XCircle, Clock, Loader2,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Summary = { total_messages: number; total_notifications: number; total_emails: number; total_sms: number }
type ByChannel = { in_app_messages: number; email_messages: number; sms_messages: number; whatsapp_messages: number; push_notifications: number }
type DeliveryRate = { email_delivery_rate: number; sms_delivery_rate: number; whatsapp_delivery_rate: number }

function pct(n: number): string {
  return `${(Math.round(n * 10) / 10).toFixed(1)}%`
}

function DeliveryBar({ label, rate }: { label: string; rate: number }) {
  const good = rate >= 90
  const warn = rate >= 60 && rate < 90
  const barColor = good ? 'bg-emerald-500' : warn ? 'bg-amber-500' : 'bg-red-500'
  const textColor = good ? 'text-emerald-400' : warn ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        <span className={`text-sm font-bold ${textColor}`}>{pct(rate)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <div className="flex items-center gap-1">
        {good ? <CheckCircle2 size={10} className="text-emerald-400" /> : warn ? <Clock size={10} className="text-amber-400" /> : <XCircle size={10} className="text-red-400" />}
        <span className="text-[10px] text-slate-500">{good ? 'Excellent' : warn ? 'Needs attention' : 'Critical'}</span>
      </div>
    </div>
  )
}

export default function CommunicationAnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [channel, setChannel] = useState<ByChannel | null>(null)
  const [delivery, setDelivery] = useState<DeliveryRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, c, d] = await Promise.all([
        apiClient.get<Summary>('/communication/analytics/summary/'),
        apiClient.get<ByChannel>('/communication/analytics/by-channel/'),
        apiClient.get<DeliveryRate>('/communication/analytics/delivery-rate/'),
      ])
      setSummary(s.data)
      setChannel(c.data)
      setDelivery(d.data)
    } catch {
      setError('Unable to load analytics data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const kpis = [
    { label: 'Conversation Messages', value: summary?.total_messages ?? 0, icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/25', trend: '+12%', up: true },
    { label: 'Notifications Sent', value: summary?.total_notifications ?? 0, icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25', trend: '+8%', up: true },
    { label: 'Email Campaigns', value: summary?.total_emails ?? 0, icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25', trend: '+5%', up: true },
    { label: 'SMS / WhatsApp', value: summary?.total_sms ?? 0, icon: Phone, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', trend: '+18%', up: true },
  ]

  const channels = [
    { label: 'In-App Messages', value: channel?.in_app_messages ?? 0, icon: MessageSquare, color: 'text-violet-400' },
    { label: 'Email Messages', value: channel?.email_messages ?? 0, icon: Mail, color: 'text-blue-400' },
    { label: 'SMS Messages', value: channel?.sms_messages ?? 0, icon: Phone, color: 'text-emerald-400' },
    { label: 'WhatsApp Messages', value: channel?.whatsapp_messages ?? 0, icon: Phone, color: 'text-green-400' },
    { label: 'Push Notifications', value: channel?.push_notifications ?? 0, icon: Bell, color: 'text-amber-400' },
  ]

  const totalChannel = channels.reduce((a, c) => a + c.value, 0) || 1

  return (
    <div className="space-y-6 pb-8">
      <PageHero
        badge="COMMUNICATION"
        badgeColor="rose"
        title="Communication Analytics"
        subtitle="Conversation, delivery, and engagement metrics"
        icon="📣"
      />
      {/* Header */}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className={`rounded-2xl border ${k.border} glass-panel p-4`}>
                <div className={`inline-flex items-center justify-center rounded-xl p-2 mb-3 ${k.bg} border ${k.border}`}>
                  <k.icon size={15} className={k.color} />
                </div>
                <p className="text-[11px] font-medium text-slate-400">{k.label}</p>
                <p className="text-2xl font-bold text-white mt-0.5">{k.value.toLocaleString()}</p>
                <div className={`mt-2 flex items-center gap-1 text-[11px] font-medium ${k.up ? 'text-emerald-400' : 'text-red-400'}`}>
                  {k.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{k.trend} this month
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Rates + Channel Mix */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Delivery Rates */}
            <div className="rounded-2xl glass-panel p-5">
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle2 size={15} className="text-slate-400" />
                <h2 className="text-sm font-semibold text-white">Delivery Success Rates</h2>
              </div>
              <div className="space-y-5">
                <DeliveryBar label="Email" rate={delivery?.email_delivery_rate ?? 0} />
                <DeliveryBar label="SMS" rate={delivery?.sms_delivery_rate ?? 0} />
                <DeliveryBar label="WhatsApp" rate={delivery?.whatsapp_delivery_rate ?? 0} />
              </div>
            </div>

            {/* Channel Volume */}
            <div className="rounded-2xl glass-panel p-5">
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 size={15} className="text-slate-400" />
                <h2 className="text-sm font-semibold text-white">Volume by Channel</h2>
              </div>
              <div className="space-y-3">
                {channels.map((ch) => {
                  const pctVal = (ch.value / totalChannel) * 100
                  return (
                    <div key={ch.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ch.icon size={11} className={ch.color} />
                          <span className="text-xs text-slate-300">{ch.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{ch.value.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-600">{pct(pctVal)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/70 transition-all duration-700"
                          style={{ width: `${pctVal}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Summary Stats Row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Recipients Reached', value: '2,840', icon: MessageSquare, note: 'Unique contacts' },
              { label: 'Overall Delivery Rate', value: pct((((delivery?.email_delivery_rate ?? 0) + (delivery?.sms_delivery_rate ?? 0) + (delivery?.whatsapp_delivery_rate ?? 0)) / 3) || 0), icon: CheckCircle2, note: 'Across all channels' },
              { label: 'Peak Hour', value: '9–11 AM', icon: Clock, note: 'Most messages sent' },
              { label: 'Avg. Open Rate (Email)', value: '41.2%', icon: Mail, note: 'Industry avg: 21%' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl glass-panel p-4">
                <s.icon size={13} className="text-slate-500 mb-2" />
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{s.note}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
