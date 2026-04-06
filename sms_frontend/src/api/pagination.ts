export type PaginatedResponse<T> = {
  count: number
  next?: string | null
  previous?: string | null
  results: T[]
}

export const normalizePaginatedResponse = <T>(
  data: T[] | PaginatedResponse<T>,
): { items: T[]; totalCount: number; isPaginated: boolean } => {
  if (Array.isArray(data)) {
    return { items: data, totalCount: data.length, isPaginated: false }
  }
  const results = Array.isArray(data.results) ? data.results : []
  const total = typeof data.count === 'number' ? data.count : results.length
  return { items: results, totalCount: total, isPaginated: true }
}
