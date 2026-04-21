'use client'

import { toCsv, downloadCsv } from '@/lib/export/csv'

type Props = {
  data: Record<string, unknown>[]
  columns: string[]
  filename: string
  label?: string
}

export function ExportButton({ data, columns, filename, label = 'Export CSV' }: Props) {
  function handleClick() {
    const csv = toCsv(data, columns)
    downloadCsv(filename, csv)
  }

  return (
    <button
      onClick={handleClick}
      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
      data-testid="export-button"
    >
      {label}
    </button>
  )
}
