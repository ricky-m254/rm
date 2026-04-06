import { useEffect, useRef, useState } from 'react'
import { apiClient } from '../api/client'

interface PrintButtonProps {
  printId?: string
  label?: string
  title?: string
  className?: string
  size?: 'sm' | 'md'
}

interface SchoolBranding {
  school_name: string
  logo_url: string | null
  primary_color: string
  motto: string
}

let brandingCache: SchoolBranding | null = null

async function loadBranding(): Promise<SchoolBranding> {
  if (brandingCache) return brandingCache
  try {
    const res = await apiClient.get<any>('/school/profile/')
    const p = res.data.profile ?? res.data
    brandingCache = {
      school_name: p.school_name || 'Rynaty School',
      logo_url: p.logo_url || null,
      primary_color: p.primary_color || '#10b981',
      motto: p.motto || '',
    }
    return brandingCache
  } catch {
    return { school_name: 'Rynaty School', logo_url: null, primary_color: '#10b981', motto: '' }
  }
}

function buildPrintHeader(branding: SchoolBranding, title: string): string {
  const logoHtml = branding.logo_url
    ? `<img src="${branding.logo_url}" alt="logo" style="width:56px;height:56px;object-fit:contain;border-radius:8px;margin-right:14px;" />`
    : `<div style="width:56px;height:56px;border-radius:8px;background:${branding.primary_color};display:flex;align-items:center;justify-content:center;margin-right:14px;font-size:22px;font-weight:900;color:white;flex-shrink:0;">${(branding.school_name[0] || 'S').toUpperCase()}</div>`

  return `
    <div style="border-bottom:3px solid ${branding.primary_color};padding-bottom:14px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;">
        ${logoHtml}
        <div>
          <h1 style="font-size:20px;font-weight:900;margin:0 0 2px;color:#111;">${branding.school_name}</h1>
          ${branding.motto ? `<p style="font-size:11px;color:#888;margin:0 0 4px;font-style:italic;">${branding.motto}</p>` : ''}
          <h2 style="font-size:14px;font-weight:700;margin:0;color:${branding.primary_color};">${title}</h2>
        </div>
      </div>
    </div>
  `
}

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: white; padding: 24px; }
  h3 { font-size: 13px; font-weight: 600; margin: 12px 0 6px; }
  p { margin-bottom: 4px; color: #555; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #f5f5f5; border: 1px solid #ccc; padding: 7px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
  td { border: 1px solid #ddd; padding: 6px 10px; font-size: 12px; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: bold; border: 1px solid #ddd; }
  .badge-pass, .badge-green { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
  .badge-fail, .badge-red { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
  .badge-pending, .badge-amber { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
  .badge-blue { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
  .meta { display: flex; flex-wrap: wrap; gap: 20px; margin: 10px 0 16px; font-size: 11px; color: #555; }
  .meta span strong { color: #111; }
  hr { border: none; border-top: 1px solid #eee; margin: 12px 0; }
  .print-footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; display: flex; justify-content: space-between; }
  @media print { body { padding: 12px; } .no-print { display: none !important; } }
`

export default function PrintButton({ printId, label = 'Print', title, className, size = 'sm' }: PrintButtonProps) {
  const [printing, setPrinting] = useState(false)
  const brandingRef = useRef<SchoolBranding | null>(null)

  useEffect(() => {
    loadBranding().then(b => { brandingRef.current = b }).catch(() => {})
  }, [])

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const branding = brandingRef.current ?? await loadBranding()
      const docTitle = title || label

      if (!printId) { window.print(); return }
      const el = document.getElementById(printId)
      if (!el) { window.print(); return }

      const win = window.open('', '_blank', 'width=960,height=720')
      if (!win) { window.print(); return }

      win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${docTitle} — ${branding.school_name}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  ${buildPrintHeader(branding, docTitle)}
  ${el.innerHTML}
  <div class="print-footer">
    <span>${branding.school_name} — School Management System</span>
    <span>Printed: ${new Date().toLocaleString('en-KE')}</span>
  </div>
  <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 1200); }<\/script>
</body>
</html>`)
      win.document.close()
    } finally {
      setPrinting(false)
    }
  }

  const baseClass = size === 'sm'
    ? 'flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition'
    : 'flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition'

  return (
    <button onClick={() => void handlePrint()} disabled={printing} className={className ?? baseClass}>
      🖨 {printing ? 'Preparing…' : label}
    </button>
  )
}
