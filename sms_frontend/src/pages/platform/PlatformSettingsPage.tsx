import { useEffect, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type PlatformSetting = {
  id: number
  key: string
  value: unknown
  description: string
  is_secret: boolean
  updated_by_username: string | null
  updated_at: string
}

export default function PlatformSettingsPage() {
  const [rows, setRows] = useState<PlatformSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    key: '',
    value: '{"enabled": true}',
    description: '',
    is_secret: false,
  })

  const loadSettings = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await publicApiClient.get<PlatformSetting[] | { results: PlatformSetting[]; count: number }>('/platform/settings/')
      setRows(normalizePaginatedResponse(response.data).items)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load platform settings.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const saveSetting = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(form.value)
    } catch {
      setError('Value must be valid JSON.')
      return
    }
    try {
      const existing = rows.find((item) => item.key === form.key.trim())
      if (existing) {
        await publicApiClient.patch(`/platform/settings/${existing.id}/`, {
          value: parsed,
          description: form.description,
          is_secret: form.is_secret,
        })
        setMessage(`Updated "${existing.key}".`)
      } else {
        await publicApiClient.post('/platform/settings/', {
          key: form.key.trim(),
          value: parsed,
          description: form.description,
          is_secret: form.is_secret,
        })
        setMessage(`Created "${form.key.trim()}".`)
      }
      await loadSettings()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to save setting.'))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Platform Settings"
        subtitle="Platform Settings management and overview."
        icon="📋"
      />
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Create / Update</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={saveSetting}>
          <input
            className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
            placeholder="setting.key"
            value={form.key}
            onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))}
            required
          />
          <label className="flex items-center gap-2 rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_secret}
              onChange={(e) => setForm((prev) => ({ ...prev, is_secret: e.target.checked }))}
            />
            Secret setting
          </label>
          <input
            className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm md:col-span-2"
            placeholder="description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <textarea
            className="min-h-[120px] rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm md:col-span-2"
            value={form.value}
            onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
          />
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 md:col-span-2" type="submit">
            Save Setting
          </button>
        </form>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Current Settings</h2>
          <button className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm" onClick={() => void loadSettings()}>Refresh</button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Secret</th>
                <th className="px-3 py-2">Updated By</th>
                <th className="px-3 py-2">Updated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? <tr><td className="px-3 py-3 text-slate-400" colSpan={5}>Loading settings...</td></tr> : null}
              {rows.map((row) => (
                <tr key={row.id} className="bg-slate-950/50">
                  <td className="px-3 py-2">{row.key}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-300">{row.is_secret ? '***hidden***' : JSON.stringify(row.value)}</td>
                  <td className="px-3 py-2">{row.is_secret ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{row.updated_by_username ?? '--'}</td>
                  <td className="px-3 py-2">{new Date(row.updated_at).toLocaleString()}</td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 ? <tr><td className="px-3 py-4 text-slate-400" colSpan={5}>No settings found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
