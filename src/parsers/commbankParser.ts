import Papa from 'papaparse'
import { v4 as uuidv4 } from 'uuid'
import type { Transaction } from '../types'

function coerceDate(raw: string) {
  const cleaned = raw.trim()
  const parts = cleaned.split(/[\/-]/)
  if (parts.length < 3) return null

  const [first, second, third] = parts.map((part) => Number(part))
  if (Number.isNaN(first) || Number.isNaN(second) || Number.isNaN(third)) return null

  if (third < 1000) {
    const year = third < 50 ? 2000 + third : 1900 + third
    return new Date(`${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`)
  }

  return new Date(`${third}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`)
}

export function parseCommbankCSV(fileContent: string, accountName: string): Transaction[] {
  const result = Papa.parse<string[]>(fileContent, {
    skipEmptyLines: true,
  })

  const transactions: Transaction[] = []

  for (const row of result.data) {
    const cleaned = row.map((cell) => cell.trim())
    if (cleaned.length < 3) continue

    const amountCandidate = cleaned.find((cell) => /^[-+]?\d+\.?\d*$/.test(cell))
    const dateCandidate = cleaned.find((cell) => /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cell))
    const description = cleaned.filter((cell) => !cell.includes('$') && !/^[-+]?\d+\.?\d*$/.test(cell) && !/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cell))[0]

    if (!amountCandidate || !dateCandidate || !description) continue

    const date = coerceDate(dateCandidate)
    const amount = Number(amountCandidate.replace(/[+,]/g, ''))

    if (!date || Number.isNaN(amount)) continue

    transactions.push({
      id: uuidv4(),
      date,
      description,
      amount,
      balance: undefined,
      account: accountName,
      source: 'csv',
    })
  }

  return transactions
}
