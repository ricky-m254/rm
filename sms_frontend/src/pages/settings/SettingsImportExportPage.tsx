import { useRef, useState } from 'react'
import { apiClient } from '../../api/client'
import {
  Upload, Download, FileText, Users, DollarSign,
  CheckCircle, RefreshCw, Eye, Send, ChevronRight,
  UserCheck,
} from 'lucide-react'
import PageHero from '../../components/PageHero'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Module = 'students' | 'staff' | 'fees' | 'payments'
type Step = 'select' | 'upload' | 'preview' | 'done'

interface ImportResult {
  valid_rows: number
  error_rows: number
  errors: { row: number; errors: string[] }[]
  preview: { row: number; [k: string]: unknown }[]
  committed: boolean
  created?: number
  failed?: number
}

const MODULES: { key: Module; label: string; icon: React.ElementType; color: string; importable: boolean }[] = [
  { key: 'students', label: 'Students', icon: Users, color: 'text-sky-400', importable: true },
  { key: 'staff', label: 'Staff', icon: UserCheck, color: 'text-violet-400', importable: true },
  { key: 'fees', label: 'Fee Structures', icon: DollarSign, color: 'text-emerald-400', importable: false },
  { key: 'payments', label: 'Payments', icon: DollarSign, color: 'text-amber-400', importable: false },
]

const EXPORT_ENDPOINTS: { module: Module; label: string; fmt: string; url: string }[] = [
  { module: 'students', label: 'Students Directory (CSV)', fmt: 'CSV', url: '/students/export/csv/' },
  { module: 'students', label: 'Students Directory (PDF)', fmt: 'PDF', url: '/students/export/pdf/' },
  { module: 'students', label: 'Student Documents (CSV)', fmt: 'CSV', url: '/students/documents/export/csv/' },
  { module: 'staff', label: 'Staff Directory (CSV)', fmt: 'CSV', url: '/staff/export/csv/' },
  { module: 'fees', label: 'Finance Summary (CSV)', fmt: 'CSV', url: '/finance/reports/summary/export/csv/' },
  { module: 'fees', label: 'Receivables Aging (CSV)', fmt: 'CSV', url: '/finance/reports/receivables-aging/export/csv/' },
  { module: 'payments', label: 'Overdue Accounts (CSV)', fmt: 'CSV', url: '/finance/reports/overdue-accounts/export/csv/' },
]

export default function SettingsImportExportPage() {
  const [tab, setTab] = useState<'import' | 'export'>('import')
  const [step, setStep] = useState<Step>('select')
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [exportFilter, setExportFilter] = useState<Module | 'all'>('all')
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('select')
    setSelectedModule(null)
    setFile(null)
    setResult(null)
  }

  const downloadTemplate = async (module: Module) => {
    setDownloading(`template-${module}`)
    try {
      const r = await apiClient.get(`/settings/import/${module}/template/`, { responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${module}_import_template.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(null)
    }
  }

  const runValidate = async (validateOnly: boolean) => {
    if (!file || !selectedModule) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('validate_only', validateOnly ? 'true' : 'false')
      const endpoint = selectedModule === 'students'
        ? '/settings/import/students/'
        : '/settings/import/staff/'
      const r = await apiClient.post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(r.data)
      setStep(r.data.committed ? 'done' : 'preview')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Import failed'
      setResult({ valid_rows: 0, error_rows: 1, errors: [{ row: 0, errors: [msg] }], preview: [], committed: false })
      setStep('preview')
    } finally {
      setImporting(false)
    }
  }

  const downloadExport = async (url: string, label: string) => {
    setDownloading(url)
    try {
      const r = await apiClient.get(url, { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = label.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.csv'
      a.click()
      URL.revokeObjectURL(blobUrl)
    } finally {
      setDownloading(null)
    }
  }

  const ModuleCard = ({ m }: { m: typeof MODULES[0] }) => {
    const Icon = m.icon
    const sel = selectedModule === m.key
    return (
      <button
        onClick={() => { setSelectedModule(m.key); setStep('upload') }}
        disabled={!m.importable}
        className={`flex items-center gap-3 p-4 rounded-xl border text-left transition ${
          sel ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/7 bg-white/2'
        } ${m.importable ? 'hover:border-white/15 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
        style={!sel ? GLASS : undefined}
      >
        <Icon className={`w-6 h-6 ${m.color}`} />
        <div>
          <div className="text-sm font-medium text-white">{m.label}</div>
          {!m.importable && <div className="text-xs text-white/30">Export only</div>}
        </div>
        {m.importable && <ChevronRight className="w-4 h-4 text-white/20 ml-auto" />}
      </button>
    )
  }

  const renderImport = () => {
    if (step === 'select') return (
      <div className="space-y-4">
        <div className="text-sm text-white/50 mb-2">Select the data type you want to import:</div>
        <div className="grid grid-cols-2 gap-3">
          {MODULES.map(m => <ModuleCard key={m.key} m={m} />)}
        </div>
      </div>
    )

    if (step === 'upload' && selectedModule) return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-white/40">
          <button onClick={() => setStep('select')} className="hover:text-white transition">Select module</button>
          <ChevronRight className="w-3 h-3" /> <span className="text-white capitalize">{selectedModule}</span>
        </div>

        {/* Download template */}
        <div className="rounded-xl p-4 flex items-center gap-4" style={GLASS}>
          <FileText className="w-8 h-8 text-sky-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-white">Step 1 — Download template</div>
            <div className="text-xs text-white/40 mt-0.5">Get the correct CSV column headers for {selectedModule}</div>
          </div>
          <button
            onClick={() => downloadTemplate(selectedModule)}
            disabled={downloading === `template-${selectedModule}`}
            className="flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs rounded-lg hover:bg-sky-500/20 transition"
          >
            {downloading === `template-${selectedModule}` ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Template
          </button>
        </div>

        {/* Upload */}
        <div className="rounded-xl p-4 space-y-3" style={GLASS}>
          <div className="text-sm font-medium text-white">Step 2 — Upload your CSV file</div>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500/30 hover:bg-emerald-500/3 transition"
          >
            <Upload className="w-8 h-8 text-white/20 mx-auto mb-2" />
            {file
              ? <div className="text-sm text-emerald-400 font-medium">{file.name}</div>
              : <div className="text-sm text-white/30">Click to choose a CSV file</div>
            }
            <div className="text-xs text-white/20 mt-1">UTF-8 encoded, comma separated</div>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => runValidate(true)}
            disabled={!file || importing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-white/70 text-sm rounded-lg hover:bg-white/5 transition disabled:opacity-40"
          >
            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Validate Only (Dry Run)
          </button>
          <button
            onClick={() => runValidate(false)}
            disabled={!file || importing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold rounded-lg transition disabled:opacity-40"
          >
            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Validate & Import
          </button>
        </div>
      </div>
    )

    if ((step === 'preview' || step === 'done') && result) return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Valid rows', value: result.valid_rows, color: 'text-emerald-400' },
            { label: 'Errors', value: result.error_rows, color: result.error_rows > 0 ? 'text-red-400' : 'text-white/40' },
            { label: result.committed ? 'Imported' : 'Preview only', value: result.committed ? (result.created ?? result.valid_rows) : '—', color: result.committed ? 'text-sky-400' : 'text-white/40' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={GLASS}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {result.error_rows > 0 && (
          <div className="rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto" style={{ ...GLASS, border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="text-xs font-semibold text-red-400 uppercase tracking-wide">Validation Errors</div>
            {result.errors.map((e, i) => (
              <div key={i} className="text-xs text-red-300/70">
                Row {e.row}: {e.errors.join(', ')}
              </div>
            ))}
          </div>
        )}

        {result.preview.length > 0 && !result.committed && (
          <div className="rounded-xl overflow-hidden" style={GLASS}>
            <div className="text-xs font-semibold text-white/50 uppercase tracking-wide p-3 border-b border-white/7">Preview (first {result.preview.length})</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <tbody>
                  {result.preview.map((row, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-2 text-white/30">Row {row.row}</td>
                      {Object.entries(row).filter(([k]) => k !== 'row').map(([k, v]) => (
                        <td key={k} className="px-3 py-2 text-white/70">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result.committed ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400 rounded-xl p-4 bg-emerald-500/5 border border-emerald-500/20">
            <CheckCircle className="w-5 h-5" />
            Import complete — {result.created ?? result.valid_rows} records created.
          </div>
        ) : (
          result.error_rows === 0 && (
            <button
              onClick={() => runValidate(false)}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold rounded-lg transition disabled:opacity-40"
            >
              {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Confirm & Import {result.valid_rows} Rows
            </button>
          )
        )}

        <button onClick={reset} className="w-full text-sm text-white/40 hover:text-white transition py-2">
          ← Import another file
        </button>
      </div>
    )

    return null
  }

  const visibleExports = exportFilter === 'all'
    ? EXPORT_ENDPOINTS
    : EXPORT_ENDPOINTS.filter(e => e.module === exportFilter)

  return (
    <div className="space-y-6">
      <PageHero
        title="Import & Export"
        subtitle="Bulk-import students and staff from CSV files, or export module data to CSV and PDF."
        icon={<Upload className="w-6 h-6 text-sky-400" />}
      />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={GLASS}>
        {(['import', 'export'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); reset() }}
            className={`px-5 py-2 text-sm rounded-lg font-medium transition capitalize ${tab === t ? 'bg-emerald-500 text-black' : 'text-white/50 hover:text-white'}`}
          >
            {t === 'import' ? <span className="flex items-center gap-2"><Upload className="w-3.5 h-3.5" />Import</span>
              : <span className="flex items-center gap-2"><Download className="w-3.5 h-3.5" />Export</span>}
          </button>
        ))}
      </div>

      {tab === 'import' ? (
        <div className="max-w-2xl">
          <div className="rounded-2xl p-6" style={GLASS}>
            {renderImport()}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'students', 'staff', 'fees', 'payments'] as const).map(f => (
              <button
                key={f}
                onClick={() => setExportFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg capitalize transition ${exportFilter === f ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'border border-white/10 text-white/40 hover:text-white'}`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleExports.map(exp => (
              <div key={exp.url} className="flex items-center gap-4 p-4 rounded-xl" style={GLASS}>
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80 truncate">{exp.label}</div>
                  <div className="text-xs text-white/30 mt-0.5">{exp.fmt} · {exp.module}</div>
                </div>
                <button
                  onClick={() => downloadExport(exp.url, exp.label)}
                  disabled={downloading === exp.url}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs rounded-lg transition disabled:opacity-40"
                >
                  {downloading === exp.url
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />}
                  Download
                </button>
              </div>
            ))}
          </div>

          <div className="text-xs text-white/20 mt-2">
            * Additional exports are available inside each module's Reports section.
          </div>
        </div>
      )}
    </div>
  )
}
