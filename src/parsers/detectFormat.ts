import type { BankFormat } from '../types'

export async function detectBankFormat(file: File): Promise<BankFormat> {
  const filename = file.name.toLowerCase()

  if (filename.endsWith('.pdf')) return 'pdf'
  if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) return 'excel'
  if (filename.endsWith('.csv')) return 'csv'

  const content = await file.text()
  const firstLine = content.split('\n')[0].toLowerCase()

  if (/^\d{2}\/\d{2}\/\d{4}/.test(firstLine)) {
    return 'csv'
  }

  return 'unknown'
}
