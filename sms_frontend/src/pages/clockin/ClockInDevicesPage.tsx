import { useEffect, useRef, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Device = {
  id: number
  device_id: string
  name: string
  location: string
  device_type: 'ENTRY' | 'EXIT' | 'BOTH'
  api_key: string
  is_active: boolean
  last_seen: string | null
  notes: string
  created_at: string
  // Network / connection
  ip_address: string | null
  port: number
  http_port: number
  rtsp_port: number
  channel: number
  username: string
  password: string
  // Device identity
  brand: string
  model: string
  serial_number: string
  mac_address: string
  firmware_version: string
  discovery_method: string
}

type DiscoveredDevice = {
  ip: string
  port: number
  brand: string
  model: string
  serial: string
  mac: string
  technology: string
  device_id: string
  discovery_method: string
  already_registered: boolean
}

type ScanPhase = 'idle' | 'usb' | 'network' | 'done'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

function guessIpPrefix(): string {
  return '192.168.1'
}

// ── Dahua webhook panel component ────────────────────────────────────────────
function DahuaWebhookPanel({ device }: { device: Device }) {
  const [syncing, setSyncing]     = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const webhookUrl = `${window.location.origin}/api/clockin/dahua/event/?key=${device.api_key}`
  const isDahua    = (device.brand || '').toLowerCase().includes('dahua') || device.model?.includes('ASI')

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const pullRecords = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await apiClient.post<any>(`/clockin/dahua/${device.id}/sync/`, {
        date: new Date().toISOString().slice(0, 10),
      })
      const d = res.data
      setSyncResult(`✓ Synced: ${d.records_created} new event(s), ${d.records_skipped} already recorded.`)
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Could not reach device.'
      setSyncResult(`✗ ${msg}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* ── Dahua native HTTP Upload (primary) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {isDahua ? '📡 Dahua HTTP Upload' : 'Webhook Config'}
          </h4>
          {isDahua && (
            <button
              onClick={() => setShowGuide(g => !g)}
              className="text-[10px] text-emerald-500 hover:text-emerald-400 font-semibold uppercase tracking-wider"
            >
              {showGuide ? 'Hide Guide' : 'Setup Guide'}
            </button>
          )}
        </div>

        <div className="rounded-xl bg-slate-950 p-3 border border-white/[0.05] space-y-2">
          {/* Native Dahua webhook */}
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
              {isDahua ? '⭐ Dahua Native Endpoint (HTTP Upload)' : 'Endpoint URL'}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-mono break-all text-emerald-400 flex-1">
                POST /api/clockin/dahua/event/?key=…
              </p>
              <button
                onClick={copyUrl}
                title="Copy full URL"
                className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition shrink-0"
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
            {isDahua && (
              <p className="text-[9px] text-slate-600">
                Also accepts: JSON Events[], Records[], or heartbeat {}
              </p>
            )}
          </div>

          {/* Generic fallback */}
          <div className="border-t border-white/[0.04] pt-2 space-y-1">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Generic Fallback</p>
            <p className="text-[10px] font-mono text-slate-500">POST /api/clockin/scan/</p>
            <p className="text-[9px] font-mono text-sky-500/70">X-Device-Key: {device.api_key.substring(0, 8)}•••</p>
          </div>
        </div>
      </div>

      {/* ── Step-by-step Dahua setup guide ── */}
      {isDahua && showGuide && (
        <div className="rounded-xl bg-slate-900/80 border border-emerald-500/20 p-3 space-y-2 text-[10px]">
          <p className="font-bold text-emerald-400 text-[11px]">Configure Dahua ASI6214S → HTTP Upload</p>
          <ol className="space-y-1.5 text-slate-400 list-none">
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold shrink-0">1.</span>
              Open device web UI: <span className="font-mono text-sky-400">http://{device.ip_address || '192.168.1.108'}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold shrink-0">2.</span>
              Log in with <span className="font-mono">{device.username || 'admin'} / ••••</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold shrink-0">3.</span>
              Go to <span className="text-slate-300">Setup → Network → Integration Protocol → HTTP Subscription</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold shrink-0">4.</span>
              Set <strong className="text-slate-200">Server URL</strong> to the copied URL above
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold shrink-0">5.</span>
              Set <strong className="text-slate-200">Event Type</strong>: AccessControl (or All Events)
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold shrink-0">6.</span>
              Set <strong className="text-slate-200">Format</strong>: JSON · <strong className="text-slate-200">Method</strong>: POST
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold shrink-0">7.</span>
              Click <strong className="text-slate-200">Save</strong> — the device will now POST each scan to this server automatically.
            </li>
          </ol>
          <div className="border-t border-white/[0.05] pt-2 text-slate-500">
            <strong className="text-slate-400">Registry tip:</strong> In the Registry tab, set each person's
            Dahua User ID to match the <em>Employee No</em> configured on the device, or set their
            RFID Card No to match the card programmed in the device.
          </div>
        </div>
      )}

      {/* ── Pull records from device ── */}
      {device.ip_address && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pull Today's Records</p>
            <button
              onClick={pullRecords}
              disabled={syncing}
              className="text-[10px] px-3 py-1 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 font-semibold disabled:opacity-50 transition"
            >
              {syncing ? 'Syncing…' : '↓ Sync Now'}
            </button>
          </div>
          {syncResult && (
            <p className={`text-[10px] rounded-lg px-3 py-1.5 ${syncResult.startsWith('✓') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {syncResult}
            </p>
          )}
          <p className="text-[9px] text-slate-600">
            Pulls attendance records from the device via its HTTP API. Requires the device to be reachable from this server.
          </p>
        </div>
      )}
    </div>
  )
}

export default function ClockInDevicesPage() {
  const [devices, setDevices]     = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({
    device_id:   '',
    name:        '',
    location:    '',
    device_type: 'BOTH' as 'ENTRY' | 'EXIT' | 'BOTH',
    notes:       '',
    // Connection — Dahua ASI6214S factory defaults
    ip_address:  '',
    port:        37777,
    http_port:   80,
    rtsp_port:   37778,
    channel:     1,
    username:    'admin',
    password:    'admin123',
    // Identity
    brand:            'Dahua',
    model:            '',
    serial_number:    '',
    mac_address:      '',
    firmware_version: '',
    discovery_method: 'Manual',
  })

  const [deleteId, setDeleteId]     = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Auto-detect state ──────────────────────────────────────
  const [showDetect, setShowDetect]         = useState(false)
  const [scanPhase, setScanPhase]           = useState<ScanPhase>('idle')
  const [ipPrefix, setIpPrefix]             = useState(guessIpPrefix())
  const [scanTimeout, setScanTimeout]       = useState(0.5)
  const [discovered, setDiscovered]         = useState<DiscoveredDevice[]>([])
  const [scanLog, setScanLog]               = useState<string[]>([])
  const [usbSupported, setUsbSupported]     = useState(false)
  const [scanError, setScanError]           = useState<string | null>(null)
  const abortRef                            = useRef(false)
  const logRef                              = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUsbSupported('hid' in navigator || 'serial' in navigator)
    fetchDevices()
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [scanLog])

  const addLog = (msg: string) =>
    setScanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

  const fetchDevices = async () => {
    try {
      const res = await apiClient.get<Device[]>('/clockin/devices/')
      setDevices(res.data)
    } catch {
      setError('Unable to load devices.')
    } finally {
      setIsLoading(false)
    }
  }

  const BLANK_FORM = {
    device_id: '', name: '', location: '', device_type: 'BOTH' as const, notes: '',
    ip_address: '', port: 37777, http_port: 80, rtsp_port: 37778, channel: 1,
    username: 'admin', password: 'admin123',
    brand: 'Dahua', model: '', serial_number: '', mac_address: '', firmware_version: '',
    discovery_method: 'Manual',
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    try {
      await apiClient.post('/clockin/devices/', formData)
      setFormData(BLANK_FORM)
      setIsAdding(false)
      setShowForm(false)
      setShowDetect(false)
      fetchDevices()
    } catch (err: any) {
      const errData = err.response?.data
      const msg = errData?.detail || errData?.device_id?.[0] || errData?.ip_address?.[0] || 'Failed to add device.'
      setError(msg)
      setIsAdding(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await apiClient.delete(`/clockin/devices/${deleteId}/`)
      setDeleteId(null)
      fetchDevices()
    } catch {
      setError('Failed to delete device.')
    } finally {
      setIsDeleting(false)
    }
  }

  const prefillForm = (d: DiscoveredDevice) => {
    const isDahua = d.brand?.toLowerCase().includes('dahua') || d.port === 37777 || d.port === 37778
    setFormData({
      device_id:        d.serial ? d.serial : d.device_id,
      name:             `${d.model || d.brand} @ ${d.ip}`,
      location:         '',
      device_type:      'BOTH',
      notes:            [
        `Auto-detected via ${d.discovery_method}`,
        d.model  ? `Model: ${d.model}`   : '',
        d.serial ? `Serial: ${d.serial}` : '',
        d.mac    ? `MAC: ${d.mac}`       : '',
        `Tech: ${d.technology}`,
      ].filter(Boolean).join('\n'),
      // Network connection (use discovered IP; Dahua SDK port wins if applicable)
      ip_address:       d.ip === 'USB' ? '' : d.ip,
      port:             d.port === 80 ? 37777 : (d.port || 37777),
      http_port:        80,
      rtsp_port:        37778,
      channel:          1,
      // Dahua factory credentials
      username:         'admin',
      password:         isDahua ? 'admin123' : '',
      // Device identity
      brand:            d.brand?.split(' ')[0] || 'Dahua',
      model:            d.model || (isDahua ? 'ASI6214S' : ''),
      serial_number:    d.serial || '',
      mac_address:      d.mac || '',
      firmware_version: '',
      discovery_method: d.discovery_method || 'TCP Port Probe',
    })
    setShowForm(true)
    setShowDetect(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── USB (WebHID) detection ─────────────────────────────────
  const runUsbScan = async () => {
    abortRef.current = false
    setScanPhase('usb')
    setDiscovered([])
    setScanLog([])
    setScanError(null)
    addLog('Checking for USB-connected biometric devices (Dahua ASI6214S priority)…')

    if (!('hid' in navigator)) {
      addLog('WebHID not supported in this browser (use Chrome or Edge).')
      setScanPhase('network')
      return
    }

    try {
      addLog('Prompting browser for USB HID access — select your device in the dialog…')
      // PRIMARY: Dahua ASI6214S (vendor 0x2207 / 0x2b87) + other known brands
      const hidDevices = await (navigator as any).hid.requestDevice({
        filters: [
          { vendorId: 0x2207 },  // Dahua / Rockchip (ASI6214S USB config)
          { vendorId: 0x2b87 },  // Dahua Technology Co.
          { vendorId: 0x1b55 },  // ZKTeco
          { vendorId: 0x05ba },  // DigitalPersona / HID Global
          { vendorId: 0x1533 },  // Suprema
          { vendorId: 0x0483 },  // STMicroelectronics (generic readers)
          { vendorId: 0x04b4 },  // Cypress / generic USB HID
          { vendorId: 0x1a79 },  // Crossmatch / Aware
          { usagePage: 0x000d }, // Digitizer / biometric (catch-all)
        ],
      })

      if (!hidDevices || hidDevices.length === 0) {
        addLog('No USB biometric device selected or found via USB.')
      } else {
        for (const dev of hidDevices) {
          const devId    = `USB-HID:${dev.vendorId.toString(16).padStart(4,'0')}:${dev.productId.toString(16).padStart(4,'0')}`
          const isDahua  = dev.vendorId === 0x2207 || dev.vendorId === 0x2b87
          const brand    = isDahua
            ? (dev.productName || 'Dahua ASI6214S')
            : (dev.productName || 'USB Biometric Device')
          addLog(`✓ Found: ${brand} (VID 0x${dev.vendorId.toString(16).toUpperCase()}, PID 0x${dev.productId.toString(16).toUpperCase()})`)
          const candidate: DiscoveredDevice = {
            ip:                 'USB',
            port:               0,
            brand,
            model:              isDahua ? 'ASI6214S' : '',
            serial:             '',
            mac:                '',
            technology:         isDahua ? 'Dahua USB (ASI6214S)' : 'USB HID Fingerprint',
            device_id:          devId,
            discovery_method:   'USB HID',
            already_registered: devices.some(d => d.device_id === devId),
          }
          setDiscovered(prev => [...prev, candidate])
        }
      }
    } catch (err: any) {
      if (err.name === 'SecurityError' || err.name === 'NotAllowedError') {
        addLog('USB access denied by browser — try again and allow access in the dialog.')
      } else {
        addLog(`USB scan error: ${err.message}`)
      }
    }

    setScanPhase('network')
  }

  // ── Network scan ───────────────────────────────────────────
  const runNetworkScan = async () => {
    abortRef.current = false
    if (scanPhase === 'idle') {
      setScanPhase('network')
      setDiscovered([])
      setScanLog([])
      setScanError(null)
    }
    addLog(`Starting network scan on ${ipPrefix}.1 – ${ipPrefix}.254…`)
    addLog('PRIMARY: port 37777 (Dahua ASI6214S SDK) · Also: 37778, 80, 8000 (Dahua alt), 4370 (ZKTeco), 5010 (Anviz), 4008 (FingerTec), 9922 (Suprema)…')

    try {
      const res = await apiClient.post<{ devices: DiscoveredDevice[]; scanned: string; sadp_found?: number }>(
        '/clockin/devices/discover/',
        { ip_prefix: ipPrefix, timeout: scanTimeout },
      )
      if (abortRef.current) return
      const found = res.data.devices
      const sadpCount = res.data.sadp_found ?? 0
      addLog(`Scan complete — ${res.data.scanned}`)
      if (sadpCount > 0) addLog(`✓ SADP Ethernet broadcast identified ${sadpCount} Dahua device(s) by model & serial.`)
      addLog(found.length > 0
        ? `Total: ${found.length} device(s) found (${sadpCount} identified via SADP, ${found.length - sadpCount} via TCP).`
        : 'No biometric devices found on this subnet.')
      setDiscovered(prev => {
        const existing = prev.map(d => d.device_id)
        const fresh    = found.filter(d => !existing.includes(d.device_id))
        return [...prev, ...fresh]
      })
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Network scan failed.'
      setScanError(msg)
      addLog(`Error: ${msg}`)
    } finally {
      setScanPhase('done')
    }
  }

  const startAutoDetect = async () => {
    setScanPhase('idle')
    setDiscovered([])
    setScanLog([])
    setScanError(null)
    await runUsbScan()
    if (!abortRef.current) await runNetworkScan()
  }

  const stopScan = () => {
    abortRef.current = true
    setScanPhase('done')
    addLog('Scan cancelled by user.')
  }

  const resetDetect = () => {
    abortRef.current = true
    setScanPhase('idle')
    setDiscovered([])
    setScanLog([])
    setScanError(null)
  }

  const isScanning = scanPhase === 'usb' || scanPhase === 'network'

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <PageHero
        badge="CLOCK-IN"
        badgeColor="emerald"
        title="Devices"
        subtitle="Manage biometric and RFID clock-in devices"
        icon="⏰"
      />

      {/* ── Header bar ── */}
      <header className="rounded-2xl p-5 space-y-4" style={GLASS}>
        <div className="flex flex-wrap gap-3 justify-between items-start">
          <div>
            <h1 className="text-xl font-display font-semibold">Biometric Devices</h1>
            <p className="mt-1 text-sm text-slate-400">Fingerprint scanners, RFID terminals and network endpoints.</p>
            {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => { setShowDetect(v => !v); setShowForm(false) }}
              className="flex items-center gap-2 rounded-xl border border-white/[0.09] px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              <span>📡</span> Auto-detect
            </button>
            <button
              onClick={() => { setShowForm(v => !v); setShowDetect(false) }}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition"
            >
              {showForm ? 'Cancel' : '+ Register Device'}
            </button>
          </div>
        </div>

        {/* Quick-add shortcuts */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-white/[0.05]">
          <p className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Quick add known device:</p>
          {[
            { label: '⚡ Dahua ASI6214S',  ip: '192.168.1.108', port: 37777, http: 80, rtsp: 37778, brand: 'Dahua',    model: 'ASI6214S', user: 'admin', pass: 'admin123' },
            { label: 'ZKTeco',             ip: '192.168.1.201', port: 4370,  http: 80, rtsp: 0,     brand: 'ZKTeco',   model: '',         user: 'admin', pass: '12345' },
            { label: 'Anviz',              ip: '192.168.1.100', port: 5010,  http: 80, rtsp: 0,     brand: 'Anviz',    model: '',         user: 'admin', pass: '12345' },
            { label: 'FingerTec',          ip: '192.168.1.200', port: 4008,  http: 80, rtsp: 0,     brand: 'FingerTec',model: '',         user: 'admin', pass: '' },
          ].map(d => (
            <button
              key={d.label}
              onClick={() => {
                setFormData({
                  device_id: `${d.ip}:${d.port}`, name: `${d.brand}${d.model ? ' ' + d.model : ''} — Main Entrance`,
                  location: 'Main Entrance', device_type: 'BOTH',
                  notes: `${d.brand}${d.model ? ' ' + d.model : ''} — add using factory defaults\nChange IP if your device is not on ${d.ip}`,
                  ip_address: d.ip, port: d.port, http_port: d.http, rtsp_port: d.rtsp || 0, channel: 1,
                  username: d.user, password: d.pass,
                  brand: d.brand, model: d.model, serial_number: '', mac_address: '',
                  firmware_version: '', discovery_method: 'Manual — Factory Defaults',
                })
                setShowDetect(false)
                setShowForm(true)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                d.label.startsWith('⚡')
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                  : 'border border-white/[0.07] text-slate-400 hover:text-slate-200 hover:border-white/20'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Auto-detect panel ── */}
      {showDetect && (
        <section className="rounded-2xl p-6 space-y-5 animate-in fade-in slide-in-from-top-4" style={GLASS}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-display font-semibold text-emerald-400">Auto-detect Biometric Devices</h2>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                  PRIMARY: Dahua ASI6214S
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Scans USB and network for biometric terminals.
                <span className="ml-1 text-emerald-500/80 font-medium">Dahua ASI6214S</span> is checked first (ports 37777 / 37778 / 80),
                then ZKTeco, Anviz, FingerTec, Suprema and other terminals.
              </p>
            </div>
            <button onClick={() => { setShowDetect(false); resetDetect() }} className="shrink-0 text-slate-500 hover:text-slate-300 text-xs mt-0.5">✕ Close</button>
          </div>

          {/* ⚠ Cloud-hosting notice */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-300">Network scan cannot reach your local LAN from the cloud</p>
                <p className="text-xs text-amber-200/70">
                  This app's server runs on the internet — it cannot scan local IP addresses like <span className="font-mono">192.168.1.x</span>.
                  The network scan only works if the backend server is running on the <strong>same LAN</strong> as your Dahua device.
                </p>
              </div>
            </div>
            <div className="border-t border-amber-500/20 pt-3 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">What to do instead:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    setFormData({
                      device_id: '192.168.1.108:37777', name: 'Dahua ASI6214S — Main Entrance',
                      location: 'Main Entrance', device_type: 'BOTH',
                      notes: 'Dahua ASI6214S fingerprint + RFID terminal\nFactory default IP: 192.168.1.108\nSDK port: 37777 | HTTP port: 80',
                      ip_address: '192.168.1.108', port: 37777, http_port: 80, rtsp_port: 37778, channel: 1,
                      username: 'admin', password: 'admin123',
                      brand: 'Dahua', model: 'ASI6214S', serial_number: '', mac_address: '',
                      firmware_version: '', discovery_method: 'Manual — Factory Defaults',
                    })
                    setShowDetect(false)
                    setShowForm(true)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition"
                >
                  <span>⚡</span> Quick Add Dahua ASI6214S (factory defaults)
                </button>
                <button
                  onClick={() => window.open('http://192.168.1.108', '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-white/20 transition"
                >
                  <span>🌐</span> Open device web UI (192.168.1.108)
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                After clicking Quick Add, update the IP address if your device is not on 192.168.1.108, then click Confirm Registration.
                You can find the device IP in its web interface or by checking your router's DHCP table.
              </p>
            </div>
          </div>

          {/* Config row */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Network prefix (first 3 octets)</label>
              <input
                className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm font-mono outline-none focus:border-emerald-500 transition w-44"
                placeholder="192.168.1"
                value={ipPrefix}
                onChange={e => {
                  let val = e.target.value
                  const parts = val.split('.')
                  if (parts.length === 4 && parts.every(p => /^\d+$/.test(p) && Number(p) <= 255)) {
                    val = parts.slice(0, 3).join('.')
                  }
                  setIpPrefix(val)
                }}
                disabled={isScanning}
              />
              <p className="text-[10px] text-slate-600">Dahua ASI6214S default: <span className="font-mono text-emerald-600">192.168.1</span>.108</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Probe timeout (s)</label>
              <select
                className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500 transition"
                value={scanTimeout}
                onChange={e => setScanTimeout(Number(e.target.value))}
                disabled={isScanning}
              >
                <option value={0.3}>0.3 s — Fast</option>
                <option value={0.5}>0.5 s — Balanced</option>
                <option value={1.0}>1.0 s — Thorough</option>
                <option value={2.0}>2.0 s — Slow network</option>
              </select>
            </div>

            {!isScanning && scanPhase !== 'done' && (
              <button
                onClick={startAutoDetect}
                className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition flex items-center gap-2"
              >
                <span className="animate-pulse">🔍</span> Start Scan
              </button>
            )}
            {isScanning && (
              <button
                onClick={stopScan}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition"
              >
                ⏹ Stop
              </button>
            )}
            {scanPhase === 'done' && (
              <button
                onClick={resetDetect}
                className="rounded-xl border border-white/[0.09] px-5 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                ↺ Scan Again
              </button>
            )}
          </div>

          {/* Phase indicator */}
          {(isScanning || scanPhase === 'done') && (
            <div className="flex items-center gap-6 text-xs">
              <span className={`flex items-center gap-1.5 ${scanPhase === 'usb' ? 'text-emerald-400' : 'text-slate-400'}`}>
                {scanPhase === 'usb'
                  ? <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  : <span className="inline-block h-2 w-2 rounded-full bg-slate-600" />}
                USB / HID
              </span>
              <span className={`flex items-center gap-1.5 ${scanPhase === 'network' ? 'text-emerald-400' : 'text-slate-400'}`}>
                {scanPhase === 'network'
                  ? <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  : <span className="inline-block h-2 w-2 rounded-full bg-slate-600" />}
                Network scan
              </span>
              {scanPhase === 'done' && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Complete
                </span>
              )}
            </div>
          )}

          {/* Scan log console */}
          {scanLog.length > 0 && (
            <div
              ref={logRef}
              className="rounded-xl bg-slate-950 border border-white/[0.06] p-4 text-[11px] font-mono text-slate-400 space-y-1 max-h-36 overflow-y-auto"
            >
              {scanLog.map((line, i) => (
                <div key={i} className={line.includes('Found') || line.includes('device') ? 'text-emerald-400' : line.includes('Error') || line.includes('denied') ? 'text-rose-400' : ''}>
                  {line}
                </div>
              ))}
              {isScanning && (
                <div className="flex items-center gap-2 text-emerald-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Scanning…
                </div>
              )}
            </div>
          )}

          {scanError && (
            <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{scanError}</p>
          )}

          {/* Discovered devices */}
          {discovered.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Discovered ({discovered.length})
              </h3>
              {discovered.map((d, i) => {
                const isSadp = d.discovery_method?.includes('SADP')
                const isUsb  = d.ip === 'USB'
                return (
                  <div key={i} className={`rounded-xl border px-5 py-4 space-y-3 ${isSadp ? 'bg-emerald-950/30 border-emerald-500/20' : 'bg-slate-900 border-white/[0.07]'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-xl mt-0.5">{isUsb ? '🔌' : isSadp ? '✅' : '📡'}</span>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-100">{d.brand}</p>
                            {isSadp && (
                              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                                SADP Identified
                              </span>
                            )}
                            {d.discovery_method?.includes('HTTP') && (
                              <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-sky-400">
                                HTTP Confirmed
                              </span>
                            )}
                          </div>
                          {/* IP / address row */}
                          <p className="text-xs font-mono text-slate-500">
                            {isUsb ? d.device_id : `${d.ip} : ${d.port}`}
                            <span className="ml-2 text-slate-700">· {d.technology}</span>
                          </p>
                          {/* Identification details */}
                          {(d.model || d.serial || d.mac) && (
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] font-mono mt-1">
                              {d.model  && <span className="text-slate-400">Model: <span className="text-emerald-400">{d.model}</span></span>}
                              {d.serial && <span className="text-slate-400">S/N: <span className="text-sky-400">{d.serial}</span></span>}
                              {d.mac    && <span className="text-slate-400">MAC: <span className="text-slate-300">{d.mac}</span></span>}
                            </div>
                          )}
                          <p className="text-[10px] text-slate-600">via {d.discovery_method || 'TCP'}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {d.already_registered ? (
                          <span className="text-xs text-slate-500 border border-white/[0.07] rounded-full px-3 py-1">Already registered</span>
                        ) : (
                          <button
                            onClick={() => prefillForm(d)}
                            className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition"
                          >
                            Register →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {scanPhase === 'done' && discovered.length === 0 && (
            <div className="rounded-xl bg-slate-900 border border-white/[0.07] p-6 space-y-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="text-slate-200 text-sm font-semibold">No biometric devices found on this subnet.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    This happens when the app server is cloud-hosted and cannot reach your local network (192.168.x.x).
                    Add your device manually using the factory defaults below.
                  </p>
                </div>
              </div>

              {/* Immediate action */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Add your Dahua ASI6214S right now</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={() => {
                      setFormData({
                        device_id: '192.168.1.108:37777', name: 'Dahua ASI6214S — Main Entrance',
                        location: 'Main Entrance', device_type: 'BOTH',
                        notes: 'Dahua ASI6214S fingerprint + RFID terminal\nFactory default IP: 192.168.1.108\nSDK port: 37777 | HTTP port: 80 | RTSP port: 37778',
                        ip_address: '192.168.1.108', port: 37777, http_port: 80, rtsp_port: 37778, channel: 1,
                        username: 'admin', password: 'admin123',
                        brand: 'Dahua', model: 'ASI6214S', serial_number: '', mac_address: '',
                        firmware_version: '', discovery_method: 'Manual — Factory Defaults',
                      })
                      setShowDetect(false)
                      setShowForm(true)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition"
                  >
                    ⚡ Quick Add Dahua ASI6214S (factory defaults)
                  </button>
                  <button
                    onClick={() => window.open('http://192.168.1.108', '_blank', 'noopener,noreferrer')}
                    className="rounded-xl border border-white/[0.09] px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
                  >
                    🌐 Open device web UI
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  After clicking Quick Add, confirm or update the IP address to match your device, then click <strong>Confirm Registration</strong>.
                  To find your device's IP: check your router's DHCP table, or connect to it via <span className="font-mono">192.168.1.108</span> (factory default).
                </p>
              </div>

              {/* Factory defaults reference */}
              <div className="rounded-lg bg-slate-950 border border-white/[0.06] p-4 space-y-1.5 font-mono text-xs">
                <p className="text-slate-400 font-sans font-bold text-[10px] uppercase tracking-widest mb-2">Factory defaults — other brands</p>
                <p><span className="text-slate-400">ZKTeco</span>          → <span className="text-slate-300">192.168.1.201</span> · port <span className="text-sky-400">4370</span> · user <span className="text-slate-400">admin</span> / <span className="text-slate-400">12345</span></p>
                <p><span className="text-slate-400">Anviz</span>           → <span className="text-slate-300">192.168.1.100</span> · port <span className="text-sky-400">5010</span> · user <span className="text-slate-400">admin</span> / <span className="text-slate-400">12345</span></p>
                <p><span className="text-slate-400">FingerTec</span>       → <span className="text-slate-300">192.168.1.200</span> · port <span className="text-sky-400">4008</span></p>
                <p><span className="text-slate-400">Suprema BioStar</span> → <span className="text-slate-300">192.168.1.x</span>   · port <span className="text-sky-400">9922</span></p>
              </div>
            </div>
          )}

          {/* USB note */}
          {!usbSupported && (
            <p className="text-[11px] text-amber-400/70 bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-2">
              ⚠ USB auto-detection requires Chrome or Edge. The network scan works in all browsers.
            </p>
          )}
        </section>
      )}

      {/* ── Manual registration form ── */}
      {showForm && (
        <form onSubmit={handleAdd} className="rounded-2xl p-6 space-y-5 animate-in fade-in slide-in-from-top-4" style={GLASS}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-display font-semibold text-emerald-400">Register Device</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-white/[0.07] rounded-full px-3 py-1">
              Dahua ASI6214S defaults pre-filled
            </span>
          </div>

          {/* Identity section */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Device Identity</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Serial / Device ID *</label>
                <input required
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="e.g. 4A2F… or 192.168.1.108:37777"
                  value={formData.device_id}
                  onChange={e => setFormData({ ...formData, device_id: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Friendly Name *</label>
                <input required
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
                  placeholder="e.g. Main Entrance Terminal"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Location *</label>
                <input required
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
                  placeholder="e.g. Front Gate"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Brand</label>
                <select
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
                  value={formData.brand}
                  onChange={e => setFormData({ ...formData, brand: e.target.value })}
                >
                  <option value="Dahua">Dahua</option>
                  <option value="ZKTeco">ZKTeco</option>
                  <option value="Anviz">Anviz</option>
                  <option value="FingerTec">FingerTec</option>
                  <option value="Suprema">Suprema</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Model</label>
                <input
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="ASI6214S"
                  value={formData.model}
                  onChange={e => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Function</label>
                <select
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
                  value={formData.device_type}
                  onChange={e => setFormData({ ...formData, device_type: e.target.value as any })}
                >
                  <option value="ENTRY">Entry Only</option>
                  <option value="EXIT">Exit Only</option>
                  <option value="BOTH">Entry &amp; Exit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Network / Connection section */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Network Connection
              <span className="ml-2 normal-case font-normal text-emerald-600">Dahua ASI6214S factory: 192.168.1.108 · SDK 37777 · HTTP 80 · admin / admin123</span>
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">IP Address</label>
                <input
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="192.168.1.108"
                  value={formData.ip_address}
                  onChange={e => setFormData({ ...formData, ip_address: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">SDK Port</label>
                <input type="number"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="37777"
                  value={formData.port}
                  onChange={e => setFormData({ ...formData, port: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">HTTP Port</label>
                <input type="number"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="80"
                  value={formData.http_port}
                  onChange={e => setFormData({ ...formData, http_port: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Username</label>
                <input
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="admin"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Password</label>
                <input type="password"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="admin123"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">RTSP Port</label>
                <input type="number"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="37778"
                  value={formData.rtsp_port}
                  onChange={e => setFormData({ ...formData, rtsp_port: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Channel</label>
                <input type="number"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="1"
                  value={formData.channel}
                  onChange={e => setFormData({ ...formData, channel: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Notes</label>
            <textarea
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition resize-none"
              rows={2}
              placeholder="Hardware specs, firmware version, maintenance notes or auto-detection info…"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-xl border border-white/[0.09] px-5 py-2 text-sm text-slate-400 hover:text-slate-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={isAdding}
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50 transition">
              {isAdding ? 'Registering…' : 'Confirm Registration'}
            </button>
          </div>
        </form>
      )}

      {/* ── Registered devices list ── */}
      <div className="grid gap-6">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading devices…</div>
        ) : devices.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 flex flex-col items-center gap-5 text-center">
            <div className="text-4xl">🖥️</div>
            <div>
              <p className="text-slate-300 font-semibold">No devices registered yet</p>
              <p className="text-sm text-slate-500 mt-1 max-w-md">
                Register your Dahua ASI6214S using factory defaults — just click the button below, then confirm the IP address matches your device.
              </p>
            </div>
            <button
              onClick={() => {
                setFormData({
                  device_id: '192.168.1.108:37777', name: 'Dahua ASI6214S — Main Entrance',
                  location: 'Main Entrance', device_type: 'BOTH',
                  notes: 'Dahua ASI6214S fingerprint + RFID terminal\nFactory default IP: 192.168.1.108\nSDK port: 37777 | HTTP port: 80 | RTSP port: 37778',
                  ip_address: '192.168.1.108', port: 37777, http_port: 80, rtsp_port: 37778, channel: 1,
                  username: 'admin', password: 'admin123',
                  brand: 'Dahua', model: 'ASI6214S', serial_number: '', mac_address: '',
                  firmware_version: '', discovery_method: 'Manual — Factory Defaults',
                })
                setShowForm(true)
                setShowDetect(false)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition"
            >
              ⚡ Quick Add Dahua ASI6214S (factory defaults)
            </button>
            <p className="text-xs text-slate-600">
              After opening the form, update the IP address if your device is not on 192.168.1.108,
              give it a name and location, then click Confirm Registration.
            </p>
          </div>
        ) : (
          devices.map(device => (
            <article key={device.id} className="rounded-2xl p-6 flex flex-col md:flex-row gap-6" style={GLASS}>
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl font-display font-semibold">{device.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    device.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {device.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase">
                    {device.device_type}
                  </span>
                  {device.brand && (
                    <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-400 uppercase">
                      {device.brand}{device.model ? ` ${device.model}` : ''}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Device ID</p>
                    <p className="font-mono text-emerald-400 mt-1 break-all text-xs">{device.device_id}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Location</p>
                    <p className="text-slate-300 mt-1">{device.location}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Last Seen</p>
                    <p className="text-slate-300 mt-1 italic">{device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}</p>
                  </div>
                  {device.ip_address && (
                    <div>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">IP Address</p>
                      <p className="font-mono text-sky-400 mt-1">{device.ip_address}</p>
                    </div>
                  )}
                  {device.ip_address && (
                    <div>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">SDK · HTTP Ports</p>
                      <p className="font-mono text-slate-300 mt-1 text-xs">{device.port} · {device.http_port}</p>
                    </div>
                  )}
                  {device.serial_number && (
                    <div>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Serial</p>
                      <p className="font-mono text-slate-400 mt-1 text-xs">{device.serial_number}</p>
                    </div>
                  )}
                  {device.mac_address && (
                    <div>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">MAC</p>
                      <p className="font-mono text-slate-400 mt-1 text-xs">{device.mac_address}</p>
                    </div>
                  )}
                </div>
                {device.notes && (
                  <p className="text-xs text-slate-500 border-l-2 border-white/[0.09] pl-3 py-1 italic whitespace-pre-line">{device.notes}</p>
                )}
              </div>

              <div className="w-full md:w-80 space-y-4 border-l border-white/[0.07] pl-0 md:pl-6">
                {device.ip_address && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Connection</h4>
                    <div className="space-y-2 rounded-xl bg-slate-950 p-4 border border-white/[0.05] text-[11px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">IP</span>
                        <span className="text-sky-400">{device.ip_address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">SDK Port</span>
                        <span className="text-slate-300">{device.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">HTTP Port</span>
                        <span className="text-slate-300">{device.http_port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Username</span>
                        <span className="text-emerald-400">{device.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Password</span>
                        <span className="text-slate-400">••••••••</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Dahua ASI6214S HTTP Upload Configuration ── */}
                <DahuaWebhookPanel device={device} />

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setDeleteId(device.id)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-semibold uppercase tracking-wider">
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Device Registration"
        description="Are you sure you want to remove this device? This will invalidate its API key and it won't be able to send any more scans until re-registered."
        confirmLabel="Delete"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
