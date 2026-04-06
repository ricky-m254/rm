export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const extractFilename = (contentDisposition?: string, fallback = 'report') => {
  if (!contentDisposition) return fallback
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/['"]/g, ''))
  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i)
  if (quotedMatch?.[1]) return quotedMatch[1]
  const plainMatch = contentDisposition.match(/filename=([^;]+)/i)
  if (plainMatch?.[1]) return plainMatch[1].replace(/['"]/g, '').trim()
  return fallback
}

type BlobResponse = {
  data: Blob
  headers?: Record<string, unknown>
}

export const downloadFromResponse = (response: BlobResponse, fallbackFilename: string) => {
  const contentDisposition = String(response.headers?.['content-disposition'] ?? '')
  const filename = extractFilename(contentDisposition, fallbackFilename)
  downloadBlob(response.data, filename)
}
