import { useEffect, useMemo, useState } from 'react'
import { CategoryReview } from '../components/CategoryReview'
import { FileUploader } from '../components/FileUploader/FileUploader'
import { InsightsDashboard } from '../components/InsightsDashboard'
import { categorizeTransactions, detectInternalTransfers, normalizeMerchantLabel } from '../lib/analysis'
import { clearTransactions, loadTransactions, saveTransactions } from '../lib/storage'
import type { Transaction } from '../types'

export function UploadPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loaded, setLoaded] = useState(false)
  const [accountName, setAccountName] = useState('My account')

  useEffect(() => {
    void loadTransactions().then((storedTransactions) => {
      setTransactions(storedTransactions)
      setLoaded(true)
    })
  }, [])

  const processedTransactions = useMemo(() => {
    if (transactions.length === 0) return []

    const categorized = categorizeTransactions(transactions)
    return detectInternalTransfers(categorized)
  }, [transactions])

  const handleParsed = async (parsedTransactions: Transaction[]) => {
    const normalized = parsedTransactions.map((tx) => ({
      ...tx,
      date: tx.date instanceof Date ? tx.date : new Date(tx.date),
      account: tx.account || accountName,
    }))

    const mergedTransactions = [...transactions, ...normalized]
    const enriched = detectInternalTransfers(categorizeTransactions(mergedTransactions))
    setTransactions(enriched)
    await saveTransactions(enriched)
  }

  const handleConfirm = async (id: string, category: string, scope: 'single' | 'all-similar' = 'single') => {
    const targetTx = transactions.find((tx) => tx.id === id)
    if (!targetTx) return

    const targetMerchantGroup = targetTx.merchantGroup ?? normalizeMerchantLabel(targetTx.description)

    const updated = transactions.map((tx) => {
      const sameMerchant = (tx.merchantGroup ?? normalizeMerchantLabel(tx.description)) === targetMerchantGroup
      const sameAccount = tx.account === targetTx.account
      const shouldUpdate = scope === 'all-similar' ? sameMerchant && sameAccount : tx.id === id

      return shouldUpdate
        ? {
            ...tx,
            category,
            categoryConfirmed: true,
          }
        : tx
    })

    setTransactions(updated)
    await saveTransactions(updated)
  }

  const handleCustomNameChange = async (updatedTransactions: Transaction[]) => {
    setTransactions(updatedTransactions)
    await saveTransactions(updatedTransactions)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="rounded-2xl bg-slate-900 text-white p-6">
        <h1 className="text-3xl font-bold mb-1">Pocket Analyzer</h1>
        <p className="text-slate-300">A frontend-only spending planner that scans your bank statements in the browser.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Account label for this upload
              <input
                value={accountName}
                onChange={(event) => setAccountName(event.target.value || 'My account')}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="e.g. Ravi account or Wife account"
              />
            </label>
            <FileUploader accountName={accountName} onParsed={handleParsed} />
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Stored transactions</h2>
                <p className="text-sm text-slate-500">{processedTransactions.length} records loaded locally in IndexedDB</p>
              </div>
              <button
                onClick={() => {
                  void clearTransactions().then(() => setTransactions([]))
                }}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-100"
              >
                Clear saved data
              </button>
            </div>
          </div>

          <CategoryReview transactions={processedTransactions} onConfirm={handleConfirm} />
        </section>

        <section className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Data summary</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <p>Upload each account with its own label to let the app compare them and flag internal transfers.</p>
              <p>Source types supported: CSV, XLSX, and PDF</p>
              <p>Category review: confirm uncertain merchants</p>
              <p>Insights: monthly pattern, yearly trend, and drain suggestions</p>
            </div>
          </div>

          {loaded && <InsightsDashboard transactions={processedTransactions} onCustomNameChange={handleCustomNameChange} />}
        </section>
      </div>
    </div>
  )
}
