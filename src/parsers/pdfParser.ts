import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { Transaction } from '../types'

GlobalWorkerOptions.workerSrc = pdfWorker

type PdfTextItem = {
  str?: string
  transform?: number[]
}

const DATE_REGEX = /^(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})$/
const AMOUNT_REGEX = /^[-+]?\$?\d{1,3}(?:,\d{3})*(?:\.\d+)?$/

function hasDateToken(value: string) {
  return DATE_REGEX.test(value.trim())
}

function parseDateToken(value: string) {
  const clean = value.trim()
  const date = new Date(clean)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseAmountToken(value: string) {
  const clean = value.trim().replace(/[$,]/g, '')
  if (!AMOUNT_REGEX.test(clean)) return null

  const numericValue = Number(clean)
  return Number.isFinite(numericValue) ? numericValue : null
}

function buildPdfRows(content: { items: PdfTextItem[] | unknown[] }) {
  const rowMap = new Map<number, PdfTextItem[]>()

  for (const item of content.items as PdfTextItem[]) {
    const str = item?.str?.trim()
    if (!str) continue

    const y = Math.round((item.transform?.[5] ?? 0) * 10) / 10
    const existing = rowMap.get(y) ?? []
    existing.push(item)
    rowMap.set(y, existing)
  }

  return [...rowMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, items]) => items.sort((left, right) => (left.transform?.[4] ?? 0) - (right.transform?.[4] ?? 0)))
}

export async function parsePDF(file: File, accountName: string): Promise<Transaction[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise

  const transactions: Transaction[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const rows = buildPdfRows(content)

    let currentTransaction: {
      date: Date
      descriptionParts: string[]
      amount: number | null
      balance: number | null
    } | null = null

    for (const row of rows) {
      const dateToken = row.find((item) => hasDateToken(item.str ?? ''))

      if (dateToken?.str) {
        if (currentTransaction) {
          const description = currentTransaction.descriptionParts.join(' ').replace(/\s+/g, ' ').trim()
          const amount = currentTransaction.amount
          if (currentTransaction.date && description && amount !== null) {
            transactions.push({
              id: crypto.randomUUID(),
              date: currentTransaction.date,
              description,
              amount,
              account: accountName,
              source: 'pdf',
            })
          }
        }

        const parsedDate = parseDateToken(dateToken.str)
        if (!parsedDate) continue

        currentTransaction = {
          date: parsedDate,
          descriptionParts: [],
          amount: null,
          balance: null,
        }
      }

      if (!currentTransaction) continue

      for (const item of row) {
        const raw = item.str?.trim()
        if (!raw) continue
        if (raw === dateToken?.str) continue

        const x = item.transform?.[4] ?? 0
        const amount = parseAmountToken(raw)
        if (amount !== null) {
          if (x > 400 && x < 470 && currentTransaction.amount === null) {
            currentTransaction.amount = amount
          } else if (x >= 470 && currentTransaction.balance === null) {
            currentTransaction.balance = amount
          }
          continue
        }

        if (raw.length <= 2) continue
        currentTransaction.descriptionParts.push(raw)
      }
    }

    if (currentTransaction) {
      const description = currentTransaction.descriptionParts.join(' ').replace(/\s+/g, ' ').trim()
      const amount = currentTransaction.amount
      if (currentTransaction.date && description && amount !== null) {
        transactions.push({
          id: crypto.randomUUID(),
          date: currentTransaction.date,
          description,
          amount,
          account: accountName,
          source: 'pdf',
        })
      }
    }
  }

  return transactions
}
