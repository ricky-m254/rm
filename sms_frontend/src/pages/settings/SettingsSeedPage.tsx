import { useState } from 'react'
import { apiClient } from '../../api/client'
import { Loader2, Sprout, AlertTriangle, CheckCircle2, Database, Users, BookOpen, Bus, Bed, DollarSign } from 'lucide-react'
import { isAdminFamilyRole } from '../../lib/roleCatalog'
import { useAuthStore } from '../../store/auth'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const MODULE_CHIPS = [
  { label: 'Students & Guardians',  icon: Users,       color: '#10b981' },
  { label: 'Academic Years & Terms',icon: BookOpen,    color: '#38bdf8' },
  { label: 'Fee Structures',        icon: DollarSign,  color: '#f59e0b' },
  { label: 'Staff & HR',            icon: Users,       color: '#a78bfa' },
  { label: 'Transport Fleet',       icon: Bus,         color: '#ec4899' },
  { label: 'Hostel Allocation',     icon: Bed,         color: '#0ea5e9' },
  { label: 'Roles & Permissions',   icon: Database,    color: '#6366f1' },
]

export default function SettingsSeedPage() {
  const role = useAuthStore(s => s.role)
  const canSeedData = isAdminFamilyRole(role)
  const [seeding, setSeeding]       = useState(false)
  const [seedMsg, setSeedMsg]       = useState<string | null>(null)
  const [seedSuccess, setSeedSuccess] = useState(false)
  const [seedingTransport, setSeedingTransport] = useState(false)
  const [transportMsg, setTransportMsg] = useState<string | null>(null)

  if (!canSeedData) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="relative overflow-hidden rounded-3xl px-6 py-8"
          style={{ background: 'linear-gradient(135deg, #070b12 0%, #0d1a2e 50%, #091520 100%)' }}>
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(ellipse at 80% 40%, rgba(244,63,94,0.45) 0%, transparent 55%), radial-gradient(ellipse at 15% 70%, rgba(245,158,11,0.25) 0%, transparent 50%)'
          }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(244,63,94,0.18)', color: '#fda4af', border: '1px solid rgba(244,63,94,0.3)' }}>
                SYSTEM · SEED DATA
              </span>
            </div>
            <h1 className="text-2xl font-display font-bold text-white mb-2">Sample Data Seeder</h1>
            <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
              Sample data seeding is restricted to school administrators because it creates tenant records across multiple modules.
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.2)' }}>
          <AlertTriangle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose-300 mb-1">Administrator access required</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ask a school administrator to run the tenant seeder or the transport sample-data seeder on your behalf.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleSeedAll = async () => {
    if (!confirm('This will add Kenyan school sample data to all modules. Existing records will NOT be deleted. Continue?')) return
    setSeeding(true)
    setSeedMsg(null)
    setSeedSuccess(false)
    try {
      await apiClient.post('/school/seed/')
      setSeedMsg('All modules seeded with sample Kenyan school data.')
      setSeedSuccess(true)
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSeedMsg(msg ?? 'Seeding failed. Please try again or check admin permissions.')
      setSeedSuccess(false)
    } finally {
      setSeeding(false)
    }
  }

  const handleSeedTransport = async () => {
    setSeedingTransport(true)
    setTransportMsg(null)
    try {
      await apiClient.post('/transport/seed/')
      setTransportMsg('Transport sample data seeded (4 buses + 4 Nairobi routes).')
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setTransportMsg(msg ?? 'Transport seeding failed.')
    } finally {
      setSeedingTransport(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-8"
        style={{ background: 'linear-gradient(135deg, #070b12 0%, #0d1a2e 50%, #091520 100%)' }}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(ellipse at 80% 40%, rgba(16,185,129,0.5) 0%, transparent 55%), radial-gradient(ellipse at 15% 70%, rgba(56,189,248,0.3) 0%, transparent 50%)'
        }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(16,185,129,0.18)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}>
              SYSTEM · SEED DATA
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">Sample Data Seeder</h1>
          <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
            Populate your school with comprehensive Kenyan CBC sample data — students, staff, fees, academics, transport, and more. Use this to explore all modules instantly.
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-300 mb-1">Safe to run on existing data</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            This seeder uses <strong className="text-slate-300">get_or_create</strong> logic — it will not duplicate existing records.
            Running it multiple times is idempotent. However, it will create records if they do not exist, which cannot be automatically undone.
          </p>
        </div>
      </div>

      {/* What gets seeded */}
      <div className="rounded-2xl p-5" style={GLASS}>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">What Gets Seeded</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MODULE_CHIPS.map(m => (
            <div key={m.label} className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: `${m.color}0d`, border: `1px solid ${m.color}25` }}>
              <m.icon size={12} style={{ color: m.color }} />
              <span className="text-[11px] text-slate-300 font-medium">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 px-3 py-2.5 rounded-xl text-[11px] text-slate-400 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <strong className="text-slate-300">Includes:</strong> 40 students with Kenyan names, 12 teachers, academic years &amp; terms, CBC grade levels (PP1–Grade 9), fee structures, invoices &amp; payments, admission applications, library books, communication messages, HR leave data, and more.
        </div>
      </div>

      {/* Seed result banner */}
      {seedMsg && (
        <div className={`rounded-xl px-4 py-3 flex items-start gap-3 text-sm ${seedSuccess ? 'border-emerald-500/40 bg-emerald-500/08 text-emerald-200' : 'border-rose-500/40 bg-rose-500/08 text-rose-200'}`}
          style={{ border: seedSuccess ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)' }}>
          {seedSuccess
            ? <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            : <AlertTriangle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />}
          <span>{seedMsg}</span>
        </div>
      )}

      {/* Primary seed button */}
      <div className="rounded-2xl p-5 space-y-3" style={GLASS}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white mb-1">Seed All Modules</p>
            <p className="text-[12px] text-slate-400">
              Runs the comprehensive Kenya school seeder — covers all major modules in one click.
            </p>
          </div>
          <button
            onClick={() => void handleSeedAll()}
            disabled={seeding}
            className="flex-shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            {seeding ? <><Loader2 size={14} className="animate-spin" /> Seeding…</> : <><Sprout size={14} /> Seed All Modules</>}
          </button>
        </div>
        {seeding && (
          <div className="rounded-xl px-3 py-2 text-[11px] text-slate-400 flex items-center gap-2"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <Loader2 size={11} className="animate-spin text-emerald-400" />
            Running seed command… this may take 15–30 seconds.
          </div>
        )}
      </div>

      {/* Transport-only seed */}
      <div className="rounded-2xl p-5 space-y-3" style={GLASS}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white mb-1">Seed Transport Only</p>
            <p className="text-[12px] text-slate-400">
              Seeds 4 school buses and 4 Nairobi routes (Westlands, Kibera, Karen, Eastlands) with stop details.
            </p>
          </div>
          <button
            onClick={() => void handleSeedTransport()}
            disabled={seedingTransport}
            className="flex-shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
            style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8' }}
          >
            {seedingTransport ? <><Loader2 size={14} className="animate-spin" /> Seeding…</> : <><Bus size={14} /> Seed Transport</>}
          </button>
        </div>
        {transportMsg && (
          <p className={`text-xs ${transportMsg.includes('seed') ? 'text-emerald-300' : 'text-rose-300'}`}>{transportMsg}</p>
        )}
      </div>

      {/* Help note */}
      <div className="rounded-2xl p-4 text-[11px] text-slate-500 space-y-1" style={GLASS}>
        <p className="font-semibold text-slate-400 mb-2">Tips</p>
        <p>• After seeding, navigate to any module (Students, Finance, Transport…) to see the data.</p>
        <p>• Admin credentials: tenant <strong className="text-slate-300">demo_school</strong>, username <strong className="text-slate-300">admin</strong>, password <strong className="text-slate-300">admin123</strong>.</p>
        <p>• Student login: username = admission number (e.g. <strong className="text-slate-300">STM2025001</strong>), password <strong className="text-slate-300">student123</strong>.</p>
        <p>• Parent login: username <strong className="text-slate-300">parent_kamau</strong>, password <strong className="text-slate-300">parent123</strong>.</p>
        <p>• All amounts are in KES (Kenyan Shillings).</p>
      </div>
    </div>
  )
}
