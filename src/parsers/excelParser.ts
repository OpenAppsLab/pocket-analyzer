import * as XLSX from 'xlsx'
import type { Transaction } from '../types'

function coerceDate(rawValue: unknown) {
  const dateText = String(rawValue ?? '').trim()
  if (!dateText) return null

  const match = dateText.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (match) {
    const [, day, month, yearPart] = match
    const year = Number(yearPart)
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(dateText)
  return Number.isNaN(date.getTime()) ? null : date
}

function coerceAmount(rawValue: unknown) {
  const amountText = String(rawValue ?? '').trim().replace(/[^\d.-]/g, '')
  if (!amountText) return null

  const amount = Number(amountText)
  return Number.isNaN(amount) ? null : amount
}

export async function parseExcel(file: File, accountName: string): Promise<Transaction[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown[][]

  if (rows.length < 2) {
    return []
  }

  const headers = rows[0].map((cell) => String(cell ?? '').trim().toLowerCase())
  const dateIndex = headers.findIndex((header) => /date/.test(header))
  const descriptionIndex = headers.findIndex((header) => /desc|name|merchant|payee|details/.test(header))
  const amountIndex = headers.findIndex((header) => /amount|value|debit|credit/.test(header))

  if (dateIndex === -1 || descriptionIndex === -1 || amountIndex === -1) {
    return []
  }

  const transactions: Transaction[] = []

  for (const row of rows.slice(1)) {
    const date = coerceDate(row[dateIndex])
    const amount = coerceAmount(row[amountIndex])
    const description = String(row[descriptionIndex] ?? '').trim()

    if (!date || amount === null || !description) continue

    transactions.push({
      id: crypto.randomUUID(),
      date,
      description,
      amount,
      account: accountName,
      source: 'excel',
    })
  }

  return transactions
}
