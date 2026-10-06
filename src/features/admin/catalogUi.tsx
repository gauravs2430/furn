import { useEffect, useState } from 'react'
import { CATALOG_PAGE_SIZE } from '../../domain/catalogAdmin.ts'
import type { Paged } from '../../repositories/CatalogAdminRepository.ts'
import { Button } from '../../components/ui/Button.tsx'

export function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  return fallback
}

export function useDebounced(value: string, delay = 250): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function useCatalogList<T>(
  load: (query: string, page: number) => Promise<Paged<T>>,
  query: string,
  page: number,
  reload: number,
) {
  const [result, setResult] = useState<Paged<T> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void load(query, page)
      .then((next) => {
        if (cancelled) return
        setResult(next)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(messageFrom(loadError, 'Could not load that list.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load, query, page, reload])

  return { result, error, loading }
}

export function Pager({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE))
  return (
    <div className="pager">
      <Button variant="secondary" size="sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page + 1} of {pages}
      </span>
      <Button variant="secondary" size="sm" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  )
}

export function ActiveCheck({
  checked,
  onChange,
  label = 'Active',
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}) {
  return (
    <label className="row-check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  )
}

export function usePagedQuery(query: string) {
  const needle = useDebounced(query).trim()
  const [page, setPage] = useState(0)
  const [seen, setSeen] = useState(needle)
  if (seen !== needle) {
    setSeen(needle)
    setPage(0)
  }
  return { needle, page, setPage }
}
