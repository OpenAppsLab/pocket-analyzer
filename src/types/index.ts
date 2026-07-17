export type Transaction = {
  id: string
  date: Date
  description: string
  amount: number
  balance?: number
  account: string
  source: string
  category?: string
  categoryConfirmed?: boolean
  isTransfer?: boolean
  merchantGroup?: string
  customName?: string
}

export type BankFormat = 'csv' | 'excel' | 'pdf' | 'unknown'
