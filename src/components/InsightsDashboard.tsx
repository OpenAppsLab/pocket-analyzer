import { useEffect, useMemo, useState } from 'react'
import type { Transaction } from '../types'
import { buildInsights, buildMerchantGroups, normalizeMerchantLabel } from '../lib/analysis'

function currency(value: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(value)
}

const CATEGORY_ICONS: Record<string, string> = {
  Housing: '🏠',
  Utilities: '💡',
  Groceries: '🛒',
  Dining: '🍽️',
  Transport: '🚗',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Health: '🩺',
  Education: '🎓',
  Travel: '✈️',
  Investments: '📈',
  Income: '💰',
  Transfers: '🔁',
  Other: '📦',
}

type DrillState = {
  type: 'merchant' | 'category'
  label: string
}

type Props = {
  transactions: Transaction[]
  onCustomNameChange?: (updatedTransactions: Transaction[]) => void
}

export function InsightsDashboard({ transactions, onCustomNameChange }: Props) {
  const [drillState, setDrillState] = useState<DrillState | null>(null)
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null)
  const [customNameDraft, setCustomNameDraft] = useState('')

  const [localTransactions, setLocalTransactions] = useState(transactions)

  useEffect(() => {
    setLocalTransactions(transactions)
  }, [transactions])

  const insights = buildInsights(localTransactions)
  const merchantGroups = buildMerchantGroups(localTransactions)
  const spendTransactions = useMemo(
    () => localTransactions.filter((tx) => tx.amount < 0 && !tx.isTransfer).sort((a, b) => b.date.getTime() - a.date.getTime()),
    [localTransactions],
  )

  const transferTransactions = useMemo(
    () => localTransactions.filter((tx) => tx.category === 'Transfers').sort((a, b) => b.date.getTime() - a.date.getTime()),
    [localTransactions],
  )

  const transferTotal = useMemo(
    () => transferTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
    [transferTransactions],
  )

  const transferGroups = useMemo(() => {
    const groups = new Map<string, { label: string; count: number; total: number }>()

    for (const tx of transferTransactions) {
      const label = tx.customName?.trim() || tx.merchantGroup || normalizeMerchantLabel(tx.description) || 'Unassigned transfers'
      const current = groups.get(label)
      if (current) {
        current.count += 1
        current.total += Math.abs(tx.amount)
      } else {
        groups.set(label, { label, count: 1, total: Math.abs(tx.amount) })
      }
    }

    return [...groups.values()].sort((a, b) => b.total - a.total)
  }, [transferTransactions])

  const drillTransactions = useMemo(() => {
    if (!drillState) return []

    if (drillState.type === 'merchant') {
      return spendTransactions.filter((tx) => {
        const merchant = tx.merchantGroup ?? normalizeMerchantLabel(tx.description)
        return merchant === drillState.label
      })
    }

    if (drillState.label === 'Transfers') {
      return transferTransactions
    }

    return spendTransactions.filter((tx) => tx.category === drillState.label)
  }, [drillState, spendTransactions, transferTransactions])

  const handleSaveCustomName = () => {
    const targetTx = localTransactions.find((tx) => tx.id === renameTargetId)
    if (!targetTx) return

    const targetMerchantGroup = targetTx.merchantGroup ?? normalizeMerchantLabel(targetTx.description)
    const nextTransactions = localTransactions.map((tx) => {
      const sameMerchant = (tx.merchantGroup ?? normalizeMerchantLabel(tx.description)) === targetMerchantGroup
      const sameAccount = tx.account === targetTx.account
      const isTransfer = tx.category === 'Transfers' || tx.isTransfer

      if (sameMerchant && sameAccount && isTransfer) {
        return {
          ...tx,
          customName: customNameDraft.trim() || undefined,
        }
      }

      return tx
    })

    setLocalTransactions(nextTransactions)
    onCustomNameChange?.(nextTransactions)
    setRenameTargetId(null)
    setCustomNameDraft('')
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg shadow-slate-900/20">
        <p className="text-sm text-slate-300">Plain-English summary</p>
        <p className="text-base mt-2 leading-7">
          After removing internal transfers, your strongest spending pressure is <strong>{insights.biggestCategory?.[0] ?? 'not identified yet'}</strong>,
          with <strong>{currency(insights.biggestCategory?.[1] ?? 0)}</strong> in outflows.
        </p>
        <p className="text-sm mt-2 text-slate-300">
          The merchant you spend most often on is <strong>{merchantGroups[0]?.merchant ?? 'not available'}</strong>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-lg shadow-slate-900/20">
          <p className="text-sm text-slate-300">Total spend</p>
          <p className="text-2xl font-bold mt-2">{currency(insights.totalSpend)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Top category</p>
          <p className="text-xl font-semibold mt-2">{insights.topCategories[0]?.[0] ?? 'N/A'}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Recurring merchants</p>
          <p className="text-xl font-semibold mt-2">{merchantGroups[0]?.merchant ?? 'None yet'}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-3">Monthly spend trend</h3>
          <div className="space-y-2">
            {insights.monthlySeries.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
                <span>{entry.label}</span>
                <span className="font-medium">{currency(entry.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-3">Yearly spend trend</h3>
          <div className="space-y-2">
            {insights.yearlySeries.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
                <span>{entry.label}</span>
                <span className="font-medium">{currency(entry.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-semibold text-slate-800">Top spending buckets</h3>
            <span className="text-xs rounded-full bg-violet-100 text-violet-700 px-2.5 py-1">Tap to inspect</span>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setDrillState({ type: 'category', label: 'Transfers' })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <span>🔁</span>
                  Transfers
                </span>
                <span className="font-semibold text-slate-900">{currency(transferTotal)}</span>
              </div>
            </button>

            {insights.topCategories.map(([category, total]) => (
              <button
                key={category}
                type="button"
                onClick={() => setDrillState({ type: 'category', label: category })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50"
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span>{CATEGORY_ICONS[category] ?? '📊'}</span>
                    {category}
                  </span>
                  <span className="font-semibold text-slate-900">{currency(total)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-semibold text-slate-800">Recurring merchants</h3>
            <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1">Tap to inspect</span>
          </div>
          <div className="space-y-2">
            {merchantGroups.slice(0, 5).map((group) => (
              <button
                key={group.merchant}
                type="button"
                onClick={() => setDrillState({ type: 'merchant', label: group.merchant })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span>🧾</span>
                    {group.merchant}
                  </span>
                  <span className="font-semibold text-slate-900">{group.count}x</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{currency(group.total)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-3">Money-drain hotspots</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          {insights.suggestions.map((suggestion) => (
            <li key={suggestion} className="rounded-lg bg-slate-50 px-3 py-2">• {suggestion}</li>
          ))}
        </ul>
      </div>

      {drillState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Details</p>
                <h3 className="text-lg font-semibold text-slate-800">{drillState.label}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDrillState(null)
                  setRenameTargetId(null)
                  setCustomNameDraft('')
                }}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"
              >
                Back
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto p-4">
              {drillState.label === 'Transfers' ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-800">
                    Click any transfer row below to assign a custom person or destination name. All matching transfers in the same account and merchant family will reuse that label.
                  </div>

                  <div className="space-y-2">
                    {transferGroups.map((group) => (
                      <div key={group.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-slate-700">{group.label}</span>
                          <span className="font-semibold text-slate-900">{group.count}x</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{currency(group.total)}</div>
                      </div>
                    ))}
                  </div>

                  {transferTransactions.length === 0 ? (
                    <p className="text-sm text-slate-500">No transfer transactions found for this view.</p>
                  ) : (
                    <div className="space-y-2 border-t pt-3">
                      {transferTransactions.map((tx) => (
                        <button
                          key={tx.id}
                          type="button"
                          onClick={() => {
                            setRenameTargetId(tx.id)
                            setCustomNameDraft(tx.customName ?? tx.merchantGroup ?? normalizeMerchantLabel(tx.description))
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-800">{tx.description}</p>
                              <p className="text-xs text-slate-500 mt-1">{tx.date.toLocaleDateString('en-AU')}</p>
                              <p className="text-xs text-slate-500 mt-1">{tx.customName ?? 'Unassigned'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-slate-900">{currency(Math.abs(tx.amount))}</p>
                              <p className="text-xs text-slate-500">{tx.account}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : drillTransactions.length === 0 ? (
                <p className="text-sm text-slate-500">No transactions found for this view.</p>
              ) : (
                <div className="space-y-2">
                  {drillTransactions.map((tx) => (
                    <div key={tx.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-800">{tx.description}</p>
                          <p className="text-xs text-slate-500 mt-1">{tx.date.toLocaleDateString('en-AU')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{currency(Math.abs(tx.amount))}</p>
                          <p className="text-xs text-slate-500">{tx.account}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {renameTargetId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h4 className="text-lg font-semibold text-slate-800">Name this transfer</h4>
            <p className="mt-2 text-sm text-slate-600">Give the person or destination a custom label so this transfer family can stay grouped.</p>
            <input
              value={customNameDraft}
              onChange={(event) => setCustomNameDraft(event.target.value)}
              placeholder="e.g. Wifey transfer"
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRenameTargetId(null)
                  setCustomNameDraft('')
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomName}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
              >
                Save name
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
