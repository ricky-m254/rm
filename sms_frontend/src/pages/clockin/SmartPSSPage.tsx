import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../../api/client'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const INPUT_CLS = 'w-full rounded-xl bg-white/[0.06] border border-white/[0.1] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60'
const BTN_EMERALD = 'rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 transition disabled:opacity-40 disabled:cursor-not-allowed'
const BTN_GHOST = 'rounded-xl border border-white/[0.1] hover:bg-white/[0.05] text-slate-300 text-sm px-4 py-2 transition disabled:opacity-40 disabled:cursor-not-allowed'
const BTN_RED = 'rounded-xl border border-red-500/40 hover:bg-red-500/10 text-red-400 text-sm px-3 py-1.5 transition disabled:opacity-40'

type Source = {
  id: number
  name: string
  host: string
  port: number
  use_https: boolean
  username: string
  device_model: string
  sync_days_back: number
  is_active: boolean
  last_sync_at: string | null
  last_sync_result: string
  notes: string
  api_url: string
}

type Log = {
  id: number
  source_name: string | null
  source_type: 'API' | 'CSV'
  started_at: string
  finished_at: string | null
  records_found: number
  records_saved: number
  skipped: number
  errors: number
}

const EMPTY_FORM = {
  name: '', host: '', port: 8443, use_https: false,
  username: 'admin', password: 'admin123',
  device_model: '', sync_days_back: 7, is_active: true, notes: '',
}

export default function SmartPSSPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editSource, setEditSource] = useState<Source | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [testResults, setTestResults] = useState<Record<number, { ok: boolean; message: string }>>({})
  const [testing, setTesting] = useState<number | null>(null)
  const [syncing, setSyncing] = useState<number | null>(null)
  const [syncResults, setSyncResults] = useState<Record<number, any>>({})
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResult, setCsvResult] = useState<any>(null)
  const [csvSourceId, setCsvSourceId] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [srcRes, logRes] = await Promise.all([
        apiClient.get('/clockin/smartpss/sources/'),
        apiClient.get('/clockin/smartpss/logs/'),
      ])
      setSources(srcRes.data?.results ?? srcRes.data ?? [])
      setLogs(logRes.data?.results ?? logRes.data ?? [])
    } catch { /* handled below */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditSource(null)
    setForm({ ...EMPTY_FORM })
    setFormErr('')
    setShowForm(true)
  }

  const openEdit = (src: Source) => {
    setEditSource(src)
    setForm({
      name: src.name, host: src.host, port: src.port,
      use_https: src.use_https, username: src.username, password: '',
      device_model: src.device_model || '',
      sync_days_back: src.sync_days_back, is_active: src.is_active, notes: src.notes,
    })
    setFormErr('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormErr('Name is required.'); return }
    if (!form.host.trim()) { setFormErr('Host / IP is required.'); return }
    setSaving(true); setFormErr('')
    try {
      const payload: any = { ...form }
      if (!payload.password) delete payload.password
      if (editSource) {
        await apiClient.patch(`/clockin/smartpss/sources/${editSource.id}/`, payload)
      } else {
        await apiClient.post('/clockin/smartpss/sources/', payload)
      }
      setShowForm(false)
      await load()
    } catch (err: any) {
      const data = err?.response?.data
      setFormErr(typeof data === 'string' ? data : JSON.stringify(data) || 'Save failed.')
    }
    setSaving(false)
  }

  const handleDelete = async (src: Source) => {
    if (!confirm(`Delete SmartPSS source "${src.name}"?`)) return
    await apiClient.delete(`/clockin/smartpss/sources/${src.id}/`)
    await load()
  }

  const handleTest = async (src: Source) => {
    setTesting(src.id)
    setTestResults(prev => ({ ...prev, [src.id]: { ok: false, message: 'Testing…' } }))
    try {
      const res = await apiClient.post(`/clockin/smartpss/sources/${src.id}/test/`)
      setTestResults(prev => ({ ...prev, [src.id]: res.data }))
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Network error'
      setTestResults(prev => ({ ...prev, [src.id]: { ok: false, message: msg } }))
    }
    setTesting(null)
  }

  const handleSync = async (src: Source) => {
    setSyncing(src.id)
    setSyncResults(prev => ({ ...prev, [src.id]: null }))
    try {
      const res = await apiClient.post(`/clockin/smartpss/sources/${src.id}/sync/`)
      setSyncResults(prev => ({ ...prev, [src.id]: res.data }))
      await load()
    } catch (err: any) {
      const data = err?.response?.data
      setSyncResults(prev => ({ ...prev, [src.id]: { error: data?.error || data?.detail || 'Sync failed.', tip: data?.tip } }))
    }
    setSyncing(null)
  }

  const handleCSVUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setCsvUploading(true); setCsvResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (csvSourceId) fd.append('source_id', csvSourceId)
      const res = await apiClient.post('/clockin/smartpss/import-csv/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setCsvResult(res.data)
      await load()
    } catch (err: any) {
      const data = err?.response?.data
      setCsvResult({ error: data?.error || 'Upload failed.', tip: data?.tip })
    }
    setCsvUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleString() : '—'
  const parseSyncResult = (r: string) => { try { return JSON.parse(r) } catch { return null } }

  return (
    <div style={{ background: '#070b12', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }} className="p-4 sm:p-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 700 }}>SmartPSS Lite Integration</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
            Pull attendance data from Dahua SmartPSS Lite — via API sync or CSV import
          </p>
        </div>
        <button className={BTN_EMERALD} onClick={openNew}>+ Add SmartPSS Source</button>
      </div>

      {/* Architecture info card */}
      <div style={{ ...GLASS, borderRadius: '16px', padding: '16px 20px', marginBottom: '24px', borderLeft: '3px solid #10b981' }}>
        <p style={{ fontWeight: 600, marginBottom: '8px', color: '#10b981', fontSize: '0.9rem' }}>How SmartPSS Lite Sync Works</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '0.8rem', color: '#94a3b8' }}>
          <div>
            <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '4px' }}>🔌 API Pull Mode</p>
            <p>Best when your school has a static IP + port forwarding (port 8443) from the router to the SmartPSS Lite PC. The backend calls SmartPSS Lite's REST API directly.</p>
          </div>
          <div>
            <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '4px' }}>📄 CSV Import Mode</p>
            <p>Works everywhere — no network required. Export from SmartPSS Lite → Reports → Attendance → Export CSV, then upload here. Recommended for cloud-hosted setups.</p>
          </div>
          <div>
            <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '4px' }}>🔗 Person Matching</p>
            <p>Records are matched to the Person Registry by RFID Card Number, then Employee/Person ID, then display name. Enroll persons in Registry before syncing.</p>
          </div>
        </div>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div style={{ ...GLASS, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1rem' }}>
            {editSource ? `Edit: ${editSource.name}` : 'Add SmartPSS Lite Source'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Name *</label>
              <input className={INPUT_CLS} placeholder="Main Office SmartPSS" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Host / IP Address *</label>
              <input className={INPUT_CLS} placeholder="192.168.1.200" value={form.host}
                onChange={e => setForm(f => ({ ...f, host: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Port</label>
              <input className={INPUT_CLS} type="number" value={form.port}
                onChange={e => setForm(f => ({ ...f, port: parseInt(e.target.value) || 8443 }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Username</label>
              <input className={INPUT_CLS} value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                Password {editSource ? '(leave blank to keep current)' : ''}
              </label>
              <input className={INPUT_CLS} type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Sync Days Back</label>
              <input className={INPUT_CLS} type="number" min={1} max={90} value={form.sync_days_back}
                onChange={e => setForm(f => ({ ...f, sync_days_back: parseInt(e.target.value) || 7 }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={form.use_https}
                  onChange={e => setForm(f => ({ ...f, use_https: e.target.checked }))} />
                Use HTTPS
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                Active
              </label>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Device Model</label>
              <input className={INPUT_CLS} placeholder="e.g. AS16214S, ASI7213X-T1" value={form.device_model}
                onChange={e => setForm(f => ({ ...f, device_model: e.target.value }))} />
              <p style={{ color: '#475569', fontSize: '0.72rem', marginTop: '3px' }}>
                Dahua device managed by this SmartPSS instance (optional, for reference)
              </p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Notes</label>
              <input className={INPUT_CLS} placeholder="Optional notes" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          {formErr && <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '12px' }}>{formErr}</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
            <button className={BTN_EMERALD} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editSource ? 'Update Source' : 'Add Source'}
            </button>
            <button className={BTN_GHOST} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Sources list */}
      {loading ? (
        <div style={{ ...GLASS, borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          Loading SmartPSS sources…
        </div>
      ) : sources.length === 0 && !showForm ? (
        <div style={{ ...GLASS, borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '12px' }}>🖥️</p>
          <p style={{ color: '#94a3b8', marginBottom: '8px' }}>No SmartPSS Lite sources configured yet.</p>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '20px' }}>
            Add your SmartPSS Lite PC details to start pulling attendance data, or use CSV Import below.
          </p>
          <button className={BTN_EMERALD} onClick={openNew}>+ Add SmartPSS Source</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {sources.map(src => {
            const tr = testResults[src.id]
            const sr = syncResults[src.id]
            const lastSync = parseSyncResult(src.last_sync_result)
            return (
              <div key={src.id} style={{ ...GLASS, borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 600, fontSize: '1rem' }}>{src.name}</span>
                      {src.is_active
                        ? <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: '6px', fontSize: '0.7rem', padding: '2px 8px' }}>Active</span>
                        : <span style={{ background: 'rgba(148,163,184,0.12)', color: '#94a3b8', borderRadius: '6px', fontSize: '0.7rem', padding: '2px 8px' }}>Inactive</span>
                      }
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px' }}>
                      {src.api_url} &nbsp;·&nbsp; Sync {src.sync_days_back}d back
                      {src.device_model && <>&nbsp;·&nbsp;<span style={{ color: '#10b981' }}>📷 {src.device_model}</span></>}
                    </p>
                    <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                      Last sync: {fmtDate(src.last_sync_at)}
                      {lastSync && ` · ${lastSync.records_saved ?? 0} saved, ${lastSync.skipped ?? 0} skipped`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className={BTN_GHOST} onClick={() => handleTest(src)} disabled={testing === src.id}>
                      {testing === src.id ? 'Testing…' : '🔌 Test'}
                    </button>
                    <button className={BTN_EMERALD} onClick={() => handleSync(src)} disabled={syncing === src.id || !src.is_active}>
                      {syncing === src.id ? 'Syncing…' : '⬇ Pull Sync'}
                    </button>
                    <button className={BTN_GHOST} onClick={() => openEdit(src)}>Edit</button>
                    <button className={BTN_RED} onClick={() => handleDelete(src)}>Delete</button>
                  </div>
                </div>

                {/* Test result */}
                {tr && (
                  <div style={{
                    marginTop: '12px', borderRadius: '10px', padding: '10px 14px', fontSize: '0.8rem',
                    background: tr.ok ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)',
                    border: `1px solid ${tr.ok ? 'rgba(16,185,129,0.3)' : 'rgba(248,113,113,0.3)'}`,
                    color: tr.ok ? '#6ee7b7' : '#fca5a5',
                  }}>
                    {tr.ok ? '✅' : '❌'} {tr.message}
                    {!tr.ok && (
                      <div style={{ marginTop: '6px', color: '#94a3b8', fontSize: '0.75rem' }}>
                        Tip: If the connection fails, use CSV Import below instead. Export from SmartPSS Lite → Reports → Attendance → Export.
                      </div>
                    )}
                  </div>
                )}

                {/* Sync result */}
                {sr && (
                  <div style={{
                    marginTop: '12px', borderRadius: '10px', padding: '10px 14px', fontSize: '0.8rem',
                    background: sr.error ? 'rgba(248,113,113,0.1)' : 'rgba(16,185,129,0.08)',
                    border: `1px solid ${sr.error ? 'rgba(248,113,113,0.3)' : 'rgba(16,185,129,0.2)'}`,
                  }}>
                    {sr.error ? (
                      <>
                        <p style={{ color: '#fca5a5' }}>❌ {sr.error}</p>
                        {sr.tip && <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '0.75rem' }}>{sr.tip}</p>}
                      </>
                    ) : (
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', color: '#6ee7b7' }}>
                        <span>✅ Sync complete</span>
                        <span>Found: <strong>{sr.records_found}</strong></span>
                        <span>Saved: <strong style={{ color: '#10b981' }}>{sr.records_saved}</strong></span>
                        <span>Skipped: <strong>{sr.skipped}</strong></span>
                        {sr.errors > 0 && <span style={{ color: '#f87171' }}>Errors: {sr.errors}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CSV Import section */}
      <div style={{ ...GLASS, borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '4px', fontSize: '1rem' }}>📄 CSV Import</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '16px' }}>
          Export from SmartPSS Lite: <strong style={{ color: '#e2e8f0' }}>Reports → Attendance → Search → Export</strong>.
          Save as CSV and upload below. Works with both English and Chinese column headers.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <input
            type="file" accept=".csv,.xlsx,.xls" ref={fileRef}
            style={{ color: '#94a3b8', fontSize: '0.85rem' }}
          />
          {sources.length > 0 && (
            <select
              value={csvSourceId} onChange={e => setCsvSourceId(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '7px 12px', color: '#e2e8f0', fontSize: '0.85rem' }}
            >
              <option value="">— Source (optional) —</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <button className={BTN_EMERALD} onClick={handleCSVUpload} disabled={csvUploading}>
            {csvUploading ? 'Importing…' : '⬆ Import CSV'}
          </button>
        </div>

        {csvResult && (
          <div style={{
            marginTop: '14px', borderRadius: '10px', padding: '12px 16px', fontSize: '0.85rem',
            background: csvResult.error ? 'rgba(248,113,113,0.1)' : 'rgba(16,185,129,0.08)',
            border: `1px solid ${csvResult.error ? 'rgba(248,113,113,0.3)' : 'rgba(16,185,129,0.2)'}`,
          }}>
            {csvResult.error ? (
              <>
                <p style={{ color: '#fca5a5' }}>❌ {csvResult.error}</p>
                {csvResult.tip && <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '0.75rem' }}>{csvResult.tip}</p>}
              </>
            ) : (
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', color: '#6ee7b7' }}>
                <span>✅ Import complete — <em style={{ color: '#94a3b8' }}>{csvResult.filename}</em></span>
                <span>Found: <strong>{csvResult.records_found}</strong></span>
                <span>Saved: <strong style={{ color: '#10b981' }}>{csvResult.records_saved}</strong></span>
                <span>Skipped: <strong>{csvResult.skipped}</strong></span>
                {csvResult.errors > 0 && <span style={{ color: '#f87171' }}>Errors: {csvResult.errors}</span>}
              </div>
            )}
          </div>
        )}

        {/* CSV column guide */}
        <details style={{ marginTop: '16px' }}>
          <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: '0.75rem' }}>
            Supported CSV column names (click to expand)
          </summary>
          <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#94a3b8', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
            {[
              ['Person', 'Name, Employee Name, Person Name'],
              ['ID', 'Employee ID, Employee No, Person ID, Staff ID'],
              ['Card', 'Card Number, Card No, CardNo'],
              ['Time', 'Time, DateTime, Check-in Time, Check Time'],
              ['Status', 'Status, Check Status, Check State, In/Out'],
              ['Device', 'Device Name, Reader Name, Door Name'],
            ].map(([label, cols]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 10px' }}>
                <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '2px' }}>{label}</p>
                <p>{cols}</p>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Import logs */}
      <div style={{ ...GLASS, borderRadius: '16px', padding: '24px' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1rem' }}>Import / Sync History</h2>
        {logs.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No sync or import activity yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Source', 'Type', 'Started', 'Found', 'Saved', 'Skipped', 'Errors'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 10px', color: '#e2e8f0' }}>{log.source_name ?? '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        background: log.source_type === 'API' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                        color: log.source_type === 'API' ? '#6ee7b7' : '#a5b4fc',
                        borderRadius: '6px', padding: '2px 8px', fontWeight: 500,
                      }}>
                        {log.source_type}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{fmtDate(log.started_at)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{log.records_found}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>{log.records_saved}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>{log.skipped}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: log.errors > 0 ? '#f87171' : '#64748b' }}>{log.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
