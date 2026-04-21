/**
 * Pure CSV serialization utilities.
 * toCsv is safe to call in Server Components (no DOM).
 * downloadCsv is browser-only — call only from 'use client' code.
 */

/**
 * Convert an array of records to a CSV string.
 * Fields containing commas, quotes, or newlines are quoted per RFC 4180.
 */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (val: unknown): string => {
    const str = val == null ? '' : String(val)
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str
  }

  const header = columns.join(',')
  const body = rows
    .map((row) => columns.map((col) => escape(row[col])).join(','))
    .join('\n')

  return `${header}\n${body}`
}

/**
 * Trigger a browser file download for a CSV string.
 * Must be called from a 'use client' component — requires DOM APIs.
 */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
