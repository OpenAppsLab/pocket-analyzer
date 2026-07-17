import { useState } from 'react'
import { normalizeMerchantLabel } from '../lib/analysis'
import type { Transaction } from '../types'

type ConfirmScope = 'single' | 'all-similar'

type Props = {
  transactions: Transaction[]
  onConfirm: (id: string, category: string, scope: ConfirmScope) => void
}

const CATEGORY_CHOICES = [
  'Housing',
  'Utilities',
  'Groceries',
  'Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health',
  'Education',
  'Travel',
  'Investments',
  'Income',
  'Transfers',
  'Other',
]

export function CategoryReview({ transactions, onConfirm }: Props) {
  const [pendingChoice, setPendingChoice] = useState<{ tx: Transaction; category: string } | null>(null)

  const uncertainTransactions = transactions.filter((tx) => tx.categoryConfirmed === false || tx.category === undefined)

  if (uncertainTransactions.length === 0) {
    return <div className="rounded-xl bg-white p-4 shadow-sm text-sm text-slate-500">No uncertain categories need confirmation.</div>
  }

  const similarCount = pendingChoice
    ? transactions.filter((candidate) => {
        const sameLabel = (candidate.merchantGroup ?? normalizeMerchantLabel(candidate.description)) === (pendingChoice.tx.merchantGroup ?? normalizeMerchantLabel(pendingChoice.tx.description))
        const sameAccount = candidate.account === pendingChoice.tx.account
        return sameLabel && sameAccount && candidate.id !== pendingChoice.tx.id
      }).length
    : 0

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-800 mb-2">Confirm uncertain categories</h3>
      <p className="text-sm text-slate-500 mb-3">Pick the most likely bucket for the items that the app could not recognise confidently.</p>
      <div className="space-y-3">
        {uncertainTransactions.map((tx) => (
          <div key={tx.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-slate-700">{tx.description}</p>
              <span className="text-sm text-slate-500">{tx.amount < 0 ? 'Expense' : 'Income'}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_CHOICES.map((category) => (
                <button
                  key={category}
                  onClick={() => setPendingChoice({ tx, category })}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {pendingChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold text-slate-800">Apply this category to the merchant?</h4>
            <p className="mt-2 text-sm text-slate-600">
              {pendingChoice.tx.description} will be marked as <strong>{pendingChoice.category}</strong>.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {similarCount > 0
                ? `There are ${similarCount} other similar transactions for this merchant pattern.`
                : 'No other similar transactions were found for this merchant pattern.'}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setPendingChoice(null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm(pendingChoice.tx.id, pendingChoice.category, 'single')
                  setPendingChoice(null)
                }}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700"
              >
                Single transaction
              </button>
              <button
                onClick={() => {
                  onConfirm(pendingChoice.tx.id, pendingChoice.category, 'all-similar')
                  setPendingChoice(null)
                }}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
              >
                Mark all similar transactions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
