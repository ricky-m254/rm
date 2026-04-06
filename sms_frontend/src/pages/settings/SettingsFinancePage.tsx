import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import {
  DollarSign, Save, RefreshCw, CheckCircle, AlertCircle,
  Plus, Trash2, CreditCard, FileText, Percent,
} from 'lucide-react'
import PageHero from '../../components/PageHero'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const INPUT = 'w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500/50'
const SELECT = 'w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0d1117] border border-white/10 focus:outline-none focus:border-emerald-500/50'
const LABEL = 'block text-xs text-white/50 mb-1 font-medium uppercase tracking-wide'

const ALL_PAYMENT_METHODS = ['Cash', 'MPesa', 'Bank Transfer', 'Cheque', 'Card', 'Standing Order', 'Online', 'Other']

interface FinanceConfig {
  currency: string
  tax_percentage: string
  receipt_prefix: string
  invoice_prefix: string
  late_fee_grace_days: number
  late_fee_type: string
  late_fee_value: string
  late_fee_max: string | null
  accepted_payment_methods: string[]
  late_fee_rules: LateFeeRule[]
}

interface LateFeeRule {
  id?: number
  grace_days: number
  fee_type: string
  value: string
  max_fee: string | null
  is_active: boolean
}

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS', 'ETB', 'GHS', 'NGN', 'ZAR']

const DEFAULTS: FinanceConfig = {
  currency: 'KES',
  tax_percentage: '0.00',
  receipt_prefix: 'RCT-',
  invoice_prefix: 'INV-',
  late_fee_grace_days: 0,
  late_fee_type: 'FLAT',
  late_fee_value: '0.00',
  late_fee_max: null,
  accepted_payment_methods: ['Cash', 'MPesa', 'Bank Transfer'],
  late_fee_rules: [],
}

export default function SettingsFinancePage() {
  const [cfg, setCfg] = useState<FinanceConfig>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [newRule, setNewRule] = useState<Omit<LateFeeRule, 'id' | 'is_active'>>({
    grace_days: 0, fee_type: 'FLAT', value: '0.00', max_fee: null,
  })
  const [addingRule, setAddingRule] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = async () => {
    try {
      const r = await apiClient.get('/settings/finance/')
      setCfg({ ...DEFAULTS, ...r.data })
    } catch {
      showToast('Failed to load finance settings', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const save = async () => {
    setSaving(true)
    try {
      await apiClient.patch('/settings/finance/', {
        currency: cfg.currency,
        tax_percentage: cfg.tax_percentage,
        receipt_prefix: cfg.receipt_prefix,
        invoice_prefix: cfg.invoice_prefix,
        late_fee_grace_days: cfg.late_fee_grace_days,
        late_fee_type: cfg.late_fee_type,
        late_fee_value: cfg.late_fee_value,
        late_fee_max: cfg.late_fee_max || null,
        accepted_payment_methods: cfg.accepted_payment_methods,
      })
      showToast('Finance settings saved')
    } catch {
      showToast('Save failed', false)
    } finally {
      setSaving(false)
    }
  }

  const togglePaymentMethod = (method: string) => {
    setCfg(p => ({
      ...p,
      accepted_payment_methods: p.accepted_payment_methods.includes(method)
        ? p.accepted_payment_methods.filter(m => m !== method)
        : [...p.accepted_payment_methods, method],
    }))
  }

  const addLateFeeRule = async () => {
    setAddingRule(true)
    try {
      const r = await apiClient.post('/finance/late-fee-rules/', {
        grace_days: newRule.grace_days,
        fee_type: newRule.fee_type,
        value: newRule.value,
        max_fee: newRule.max_fee || null,
        is_active: true,
      })
      setCfg(p => ({ ...p, late_fee_rules: [...p.late_fee_rules, r.data] }))
      setNewRule({ grace_days: 0, fee_type: 'FLAT', value: '0.00', max_fee: null })
      showToast('Late fee rule added')
    } catch {
      showToast('Failed to add rule', false)
    } finally {
      setAddingRule(false)
    }
  }

  const deleteRule = async (id: number) => {
    try {
      await apiClient.delete(`/finance/late-fee-rules/${id}/`)
      setCfg(p => ({ ...p, late_fee_rules: p.late_fee_rules.filter(r => r.id !== id) }))
      showToast('Rule deleted')
    } catch {
      showToast('Failed to delete rule', false)
    }
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHero
        title="Finance Configuration"
        subtitle="Manage currency, invoicing, tax, late fees, and accepted payment methods."
        icon={<DollarSign className="w-6 h-6 text-emerald-400" />}
      />

      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${toast.ok
          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Currency & Invoicing */}
        <div className="rounded-xl p-5 space-y-4" style={GLASS}>
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" /> Currency & Invoicing
          </h3>

          <Field label="Currency">
            <select className={SELECT} value={cfg.currency} onChange={e => setCfg(p => ({ ...p, currency: e.target.value }))}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Tax / VAT percentage (%)">
            <input className={INPUT} type="number" step="0.01" min="0" max="100"
              value={cfg.tax_percentage}
              onChange={e => setCfg(p => ({ ...p, tax_percentage: e.target.value }))} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Receipt prefix">
              <input className={INPUT} value={cfg.receipt_prefix}
                onChange={e => setCfg(p => ({ ...p, receipt_prefix: e.target.value }))}
                placeholder="RCT-" />
            </Field>
            <Field label="Invoice prefix">
              <input className={INPUT} value={cfg.invoice_prefix}
                onChange={e => setCfg(p => ({ ...p, invoice_prefix: e.target.value }))}
                placeholder="INV-" />
            </Field>
          </div>

          <div className="rounded-lg p-3 bg-white/3 text-xs text-white/30 space-y-1">
            <div>Receipt example: <span className="text-white/60">{cfg.receipt_prefix}00001</span></div>
            <div>Invoice example: <span className="text-white/60">{cfg.invoice_prefix}00001</span></div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="rounded-xl p-5 space-y-4" style={GLASS}>
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-sky-400" /> Accepted Payment Methods
          </h3>
          <p className="text-xs text-white/40">Enable the payment methods your school accepts. These appear on receipts and payment forms.</p>
          <div className="grid grid-cols-2 gap-2">
            {ALL_PAYMENT_METHODS.map(method => {
              const active = cfg.accepted_payment_methods.includes(method)
              return (
                <button
                  key={method}
                  onClick={() => togglePaymentMethod(method)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition text-left ${
                    active
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/3 border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  {method}
                </button>
              )
            })}
          </div>
        </div>

        {/* Late Fee Policy (profile-level) */}
        <div className="rounded-xl p-5 space-y-4" style={GLASS}>
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-400" /> Default Late Fee Policy
          </h3>

          <Field label="Grace period (days after due date)">
            <input className={INPUT} type="number" min="0"
              value={cfg.late_fee_grace_days}
              onChange={e => setCfg(p => ({ ...p, late_fee_grace_days: parseInt(e.target.value) || 0 }))} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fee type">
              <select className={SELECT} value={cfg.late_fee_type} onChange={e => setCfg(p => ({ ...p, late_fee_type: e.target.value }))}>
                <option value="FLAT">Flat amount</option>
                <option value="PERCENT">Percentage</option>
              </select>
            </Field>
            <Field label={cfg.late_fee_type === 'PERCENT' ? 'Percentage (%)' : `Amount (${cfg.currency})`}>
              <input className={INPUT} type="number" step="0.01" min="0"
                value={cfg.late_fee_value}
                onChange={e => setCfg(p => ({ ...p, late_fee_value: e.target.value }))} />
            </Field>
          </div>

          <Field label={`Maximum late fee (${cfg.currency}) — leave blank for no cap`}>
            <input className={INPUT} type="number" step="0.01" min="0"
              value={cfg.late_fee_max ?? ''}
              placeholder="No cap"
              onChange={e => setCfg(p => ({ ...p, late_fee_max: e.target.value || null }))} />
          </Field>
        </div>

        {/* Tiered Late Fee Rules */}
        <div className="rounded-xl p-5 space-y-4" style={GLASS}>
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide flex items-center gap-2">
            <Percent className="w-4 h-4 text-violet-400" /> Tiered Late Fee Rules
          </h3>
          <p className="text-xs text-white/40">Optional: create multiple rules with different grace periods for tiered escalation.</p>

          {cfg.late_fee_rules.length > 0 ? (
            <div className="space-y-2">
              {cfg.late_fee_rules.map(rule => (
                <div key={rule.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 border border-white/7">
                  <div className="flex-1 text-sm">
                    <span className="text-white/70">After </span>
                    <span className="text-amber-400 font-medium">{rule.grace_days}d</span>
                    <span className="text-white/50 mx-1.5">→</span>
                    <span className="text-emerald-400 font-medium">
                      {rule.fee_type === 'PERCENT' ? `${rule.value}%` : `${cfg.currency} ${rule.value}`}
                    </span>
                    {rule.max_fee && <span className="text-white/30 ml-1">(max {cfg.currency} {rule.max_fee})</span>}
                  </div>
                  {rule.id && (
                    <button onClick={() => deleteRule(rule.id!)}
                      className="p-1 text-white/20 hover:text-red-400 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-white/25 py-2">No tiered rules yet</div>
          )}

          {/* Add new rule */}
          <div className="border-t border-white/7 pt-3 space-y-3">
            <div className="text-xs text-white/40 font-medium">Add rule</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className={LABEL}>Grace days</div>
                <input className={INPUT} type="number" min="0"
                  value={newRule.grace_days}
                  onChange={e => setNewRule(p => ({ ...p, grace_days: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <div className={LABEL}>Type</div>
                <select className={SELECT} value={newRule.fee_type}
                  onChange={e => setNewRule(p => ({ ...p, fee_type: e.target.value }))}>
                  <option value="FLAT">Flat</option>
                  <option value="PERCENT">Percent</option>
                </select>
              </div>
              <div>
                <div className={LABEL}>Value</div>
                <input className={INPUT} type="number" step="0.01" min="0"
                  value={newRule.value}
                  onChange={e => setNewRule(p => ({ ...p, value: e.target.value }))} />
              </div>
              <div>
                <div className={LABEL}>Max (optional)</div>
                <input className={INPUT} type="number" step="0.01" min="0"
                  value={newRule.max_fee ?? ''}
                  placeholder="No cap"
                  onChange={e => setNewRule(p => ({ ...p, max_fee: e.target.value || null }))} />
              </div>
            </div>
            <button onClick={addLateFeeRule} disabled={addingRule}
              className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs rounded-lg hover:bg-violet-500/20 transition disabled:opacity-40">
              {addingRule ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Add Rule
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold rounded-lg transition disabled:opacity-50">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Finance Settings'}
        </button>
      </div>
    </div>
  )
}
