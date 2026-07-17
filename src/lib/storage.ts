import Dexie, { type Table } from 'dexie'
import type { Transaction } from '../types'

class PocketAnalyzerDb extends Dexie {
  transactions!: Table<Transaction, string>

  constructor() {
    super('pocket-analyzer-db')
    this.version(1).stores({
      transactions: '&id, date, account, category, source, isTransfer',
    })
  }
}

export const db = new PocketAnalyzerDb()

export async function saveTransactions(transactions: Transaction[]) {
  if (transactions.length === 0) return

  await db.transaction('rw', db.transactions, async () => {
    await db.transactions.bulkPut(transactions)
  })
}

export async function loadTransactions() {
  return db.transactions.orderBy('date').toArray()
}

export async function clearTransactions() {
  await db.transactions.clear()
}
