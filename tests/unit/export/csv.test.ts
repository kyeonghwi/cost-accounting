import { describe, it, expect } from 'vitest'
import { toCsv } from '../../../lib/export/csv'

describe('toCsv', () => {
  const cols = ['id', 'name', 'amount']

  it('empty rows — returns header line only', () => {
    const result = toCsv([], cols)
    expect(result).toBe('id,name,amount\n')
  })

  it('single row — produces correct CSV line', () => {
    const rows = [{ id: '1', name: 'Alice', amount: 500 }]
    const result = toCsv(rows, cols)
    expect(result).toBe('id,name,amount\n1,Alice,500')
  })

  it('multiple rows — each row on its own line', () => {
    const rows = [
      { id: '1', name: 'Alice', amount: 100 },
      { id: '2', name: 'Bob', amount: 200 },
    ]
    const result = toCsv(rows, cols)
    const lines = result.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('1,Alice,100')
    expect(lines[2]).toBe('2,Bob,200')
  })

  it('value with comma — wraps field in quotes', () => {
    const rows = [{ id: '1', name: 'Smith, John', amount: 0 }]
    const result = toCsv(rows, cols)
    expect(result).toContain('"Smith, John"')
  })

  it('value with double-quote — escapes as doubled quote inside quoted field', () => {
    const rows = [{ id: '1', name: 'He said "hello"', amount: 0 }]
    const result = toCsv(rows, cols)
    expect(result).toContain('"He said ""hello"""')
  })

  it('value with newline — wraps field in quotes', () => {
    const rows = [{ id: '1', name: 'line1\nline2', amount: 0 }]
    const result = toCsv(rows, cols)
    expect(result).toContain('"line1\nline2"')
  })

  it('null value — serialised as empty string', () => {
    const rows = [{ id: '1', name: null, amount: null }]
    const result = toCsv(rows, cols)
    // name and amount are null — fields are empty, no quotes
    expect(result).toBe('id,name,amount\n1,,')
  })

  it('undefined value — serialised as empty string', () => {
    const rows = [{ id: '2' }] // name and amount absent
    const result = toCsv(rows, cols)
    expect(result).toBe('id,name,amount\n2,,')
  })

  it('numeric value — stringified without quotes', () => {
    const rows = [{ id: '3', name: 'X', amount: 1234.56 }]
    const result = toCsv(rows, cols)
    expect(result).toContain('1234.56')
    // numeric value must NOT be wrapped in quotes
    expect(result).not.toContain('"1234.56"')
  })

  it('all columns present in each row', () => {
    const rows = [{ id: 'a', name: 'b', amount: 1 }]
    const result = toCsv(rows, cols)
    const dataLine = result.split('\n')[1]
    expect(dataLine.split(',')).toHaveLength(3)
  })

  it('single column — no trailing comma', () => {
    const rows = [{ id: '9' }]
    const result = toCsv(rows, ['id'])
    expect(result).toBe('id\n9')
  })
})
