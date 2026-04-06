export type TenantPrintMeta = {
  name?: string | null
  address?: string | null
  phone?: string | null
  logoUrl?: string | null
  schema?: string | null
}

export type PrintHeaderOptions = {
  badge?: string
  title: string
  subtitle?: string
  metaRight?: string
  generatedAt?: string
  tenant?: TenantPrintMeta
}

const buildHeader = (header: PrintHeaderOptions) => {
  const tenantName =
    header.tenant?.name ??
    header.tenant?.schema ??
    'Tenant'
  const tenantAddress = header.tenant?.address
  const tenantPhone = header.tenant?.phone
  const logoMarkup = header.tenant?.logoUrl
    ? `<img class="logo" src="${header.tenant.logoUrl}" alt="Logo" />`
    : `<div class="logo-placeholder">Logo</div>`

  const tenantDetails = [
    tenantAddress ? `<p class="muted">${tenantAddress}</p>` : '',
    tenantPhone ? `<p class="muted">${tenantPhone}</p>` : '',
  ].join('')

  return `
    <div class="header">
      <div class="header-left">
        ${logoMarkup}
        <div>
          <p class="badge">${header.badge ?? 'Report'}</p>
          <h1>${header.title}</h1>
          ${header.subtitle ? `<p class="muted">${header.subtitle}</p>` : ''}
          ${header.generatedAt ? `<p class="muted">Generated ${header.generatedAt}</p>` : ''}
        </div>
      </div>
      <div class="header-right">
        <p class="meta-title">${tenantName}</p>
        ${tenantDetails}
        ${header.metaRight ? `<p class="muted">${header.metaRight}</p>` : ''}
      </div>
    </div>
  `
}

export const buildPrintDocument = ({
  title,
  header,
  bodyHtml,
}: {
  title: string
  header: PrintHeaderOptions
  bodyHtml: string
}) => `
  <html>
    <head>
      <title>${title}</title>
      <style>
        :root {
          --ink: #0f172a;
          --muted: #64748b;
          --border: #e2e8f0;
          --surface: #ffffff;
          --accent: #16a34a;
        }
        body { font-family: "Segoe UI", Arial, sans-serif; padding: 32px; color: var(--ink); background: var(--surface); }
        h1 { font-size: 22px; margin: 0; }
        h2 { font-size: 15px; margin: 22px 0 10px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
        h3 { font-size: 13px; margin: 16px 0 8px; color: var(--ink); }
        p { margin: 4px 0; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid var(--border); padding: 8px; font-size: 11px; text-align: left; }
        th { background: #f8fafc; color: var(--muted); font-weight: 600; }
        .muted { color: var(--muted); font-size: 11px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .card { border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
        .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 16px; gap: 20px; }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .header-right { text-align: right; }
        .meta-title { font-weight: 600; font-size: 12px; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 999px; background: rgba(22, 163, 74, 0.12); color: var(--accent); font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
        .section { margin-top: 18px; }
        .divider { height: 1px; background: var(--border); margin: 18px 0; }
        .logo { width: 48px; height: 48px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border); }
        .logo-placeholder { width: 48px; height: 48px; border-radius: 10px; border: 1px dashed var(--border); color: var(--muted); font-size: 10px; display: flex; align-items: center; justify-content: center; }
      </style>
    </head>
    <body>
      ${buildHeader(header)}
      ${bodyHtml}
    </body>
  </html>
`

export const openPrintWindow = (title: string, html: string) => {
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) {
    throw new Error('Popup blocked')
  }
  printWindow.document.title = title
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
