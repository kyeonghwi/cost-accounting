'use client'

import { toCsv, downloadCsv } from '@/lib/export/csv'

type Props = {
  data: Record<string, unknown>[]
  columns: string[]
  filename: string
  label?: string
}

export function ExportButton({ data, columns, filename, label = 'CSV 내보내기' }: Props) {
  function handleClick() {
    const csv = toCsv(data, columns)
    downloadCsv(filename, csv)
  }

  return (
    <button
      onClick={handleClick}
      className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text-1 hover:bg-surface-alt"
      data-testid="export-button"
    >
      {label}
    </button>
  )
}
