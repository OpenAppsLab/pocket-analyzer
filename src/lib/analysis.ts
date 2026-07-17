import type { Transaction } from '../types'

export const CATEGORY_OPTIONS = [
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
] as const

const KEYWORD_MAP: Record<string, string[]> = {
  Housing: ['rent', 'mortgage', 'real estate', 'property', 'strata'],
  Utilities: ['electricity', 'water', 'gas', 'phone', 'telstra', 'optus', 'nbn', 'energy', 'flick', 'powertochoose', 'ausnet', 'origin'],
  Groceries: ['woolworths', 'coles', 'aldi', 'iga', 'foodworks', 'grocer', 'market', 'supermarket', 'fresh', 'fruit', 'vegie'],
  Dining: ['cafe', 'coffee', 'restaurant', 'pizza', 'kebab', 'burger', 'meal', 'mcdonalds', 'subway'],
  Transport: ['uber', 'taxi', 'fuel', 'petrol', 'metro', 'train', 'bus', 'parking', 'lyft', 'shell', 'bp', '7 eleven'],
  Shopping: ['amazon', 'target', 'kmart', 'myer', 'daiso', 'shop', 'department', '28 degrees', 'apple', 'harvey norman'],
  Entertainment: ['netflix', 'spotify', 'stan', 'youtube', 'cinema', 'movie', 'gaming', 'stream', 'foxtel', 'disney'],
  Health: ['chemist', 'pharmacy', 'medical', 'clinic', 'hospital', 'gp', 'dentist', 'bupa', 'allianz', 'insure', 'physio', 'health'],
  Education: ['course', 'udemy', 'library', 'school', 'tuition', 'university', 'study'],
  Travel: ['airbnb', 'flight', 'hotel', 'booking', 'airport', 'travel', 'qantas'],
  Investments: ['share', 'shares', 'broker', 'investment', 'invest', 'fund', 'portfolio', 'etf', 'super', 'managed fund', 'market', 'stock'],
  Income: ['salary', 'payroll', 'refund', 'deposit', 'interest', 'pay rise'],
  Transfers: ['transfer', 'pay anyone', 'payid', 'pay id', 'internal transfer', 'to wife', 'from wife', 'commbank app', 'eft'],
}

function normalizeMerchant(description: string) {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(card|eftpos|pos|debit|credit|transaction|bank|payment|payid|pay id|direct|transfer|invoice|ref|sc|inv)\b/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeReferenceToken(word: string) {
  return word.length >= 6 && /[a-z]/i.test(word) && /\d/.test(word)
}

export function normalizeMerchantLabel(description: string) {
  const cleaned = normalizeMerchant(description)
  if (!cleaned) return 'Unknown merchant'

  const tokens = cleaned
    .split(' ')
    .filter((word) => word.length > 0)
    .filter((word, index, all) => {
      if (word.length <= 2 && index !== 0) return false
      if (looksLikeReferenceToken(word)) return false
      return !all.slice(0, index).includes(word)
    })

  return tokens.join(' ') || 'Unknown merchant'
}

export function inferCategory(description: string, amount: number) {
  const cleaned = description.toLowerCase()
  const incoming = amount > 0

  if (/transfer|payid|pay id|commbank app|eft/.test(cleaned)) {
    return { category: 'Transfers', confidence: 'high', isUncertain: false }
  }

  if (incoming && /salary|payroll|refund|deposit|interest|pay rise/.test(cleaned)) {
    return { category: 'Income', confidence: 'high', isUncertain: false }
  }

  if (incoming) {
    return { category: 'Income', confidence: 'medium', isUncertain: false }
  }

  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some((keyword) => cleaned.includes(keyword))) {
      return { category, confidence: 'high', isUncertain: false }
    }
  }

  return { category: 'Other', confidence: 'low', isUncertain: true }
}

export function categorizeTransactions(transactions: Transaction[]) {
  return transactions.map((transaction) => {
    const result = inferCategory(transaction.description, transaction.amount)
    const shouldPreserve = transaction.category && transaction.categoryConfirmed

    return {
      ...transaction,
      category: shouldPreserve ? transaction.category : result.category,
      categoryConfirmed: shouldPreserve ? true : !result.isUncertain,
      merchantGroup: normalizeMerchantLabel(transaction.description),
    }
  })
}

export function detectInternalTransfers(transactions: Transaction[]) {
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime())
  const seen = new Set<string>()

  for (let i = 0; i < sorted.length; i += 1) {
    if (seen.has(sorted[i].id)) continue

    const sourceTx = sorted[i]
    const amountMagnitude = Math.abs(sourceTx.amount)

    for (let j = i + 1; j < sorted.length; j += 1) {
      const candidate = sorted[j]
      if (candidate.account === sourceTx.account) continue

      const sameDay = Math.abs(candidate.date.getTime() - sourceTx.date.getTime()) <= 1000 * 60 * 60 * 24
      const oppositeDirection = sourceTx.amount * candidate.amount < 0
      const similarMagnitude = Math.abs(amountMagnitude - Math.abs(candidate.amount)) < 1
      const transferKeywords = /transfer|pay anyone|internal transfer|to wife|from wife/i.test(sourceTx.description)
        || /transfer|pay anyone|internal transfer|to wife|from wife/i.test(candidate.description)

      if (sameDay && oppositeDirection && similarMagnitude && transferKeywords) {
        sourceTx.isTransfer = true
        sourceTx.category = 'Transfers'
        sourceTx.categoryConfirmed = true
        candidate.isTransfer = true
        candidate.category = 'Transfers'
        candidate.categoryConfirmed = true
        seen.add(sourceTx.id)
        seen.add(candidate.id)
        break
      }
    }
  }

  return sorted
}

export function buildMerchantGroups(transactions: Transaction[]) {
  const groups = new Map<string, { merchant: string; count: number; total: number }>()

  for (const tx of transactions) {
    const key = tx.merchantGroup ?? normalizeMerchantLabel(tx.description)
    const current = groups.get(key)
    if (current) {
      current.count += 1
      current.total += Math.abs(tx.amount)
    } else {
      groups.set(key, { merchant: key, count: 1, total: Math.abs(tx.amount) })
    }
  }

  return [...groups.values()].sort((a, b) => b.total - a.total)
}

export function buildInsights(transactions: Transaction[]) {
  const spendTransactions = transactions.filter((tx) => tx.amount < 0 && !tx.isTransfer)
  const expenseByCategory = spendTransactions.reduce<Record<string, number>>((accumulator, tx) => {
    const category = tx.category ?? 'Other'
    accumulator[category] = (accumulator[category] ?? 0) + Math.abs(tx.amount)
    return accumulator
  }, {})

  const monthly = new Map<string, number>()
  const yearly = new Map<string, number>()

  for (const tx of spendTransactions) {
    const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`
    const yearKey = `${tx.date.getFullYear()}`
    monthly.set(monthKey, (monthly.get(monthKey) ?? 0) + Math.abs(tx.amount))
    yearly.set(yearKey, (yearly.get(yearKey) ?? 0) + Math.abs(tx.amount))
  }

  const topCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const biggestCategory = topCategories[0]
  const merchantGroups = buildMerchantGroups(transactions)
  const topMerchant = merchantGroups[0]
  const totalSpend = spendTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const moneyLeaves = transactions.filter((tx) => tx.amount < 0).length

  const suggestions = [
    biggestCategory
      ? `Your biggest non-transfer spending bucket is ${biggestCategory[0]} at ${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(biggestCategory[1])}. Focus there first if you want to reduce regular outflows.`
      : 'You do not have any clear spending buckets yet. Upload a statement and confirm the categories.',
    topMerchant
      ? `The most frequent merchant group is ${topMerchant.merchant}, which appears ${topMerchant.count} times. Watch that pattern if it keeps repeating.`
      : 'No merchant pattern is available yet.',
    moneyLeaves > 0
      ? `You have ${moneyLeaves} spending entries, so the fastest fix is usually to cut the biggest recurring bucket first and then review repeated merchants.`
      : 'No spending entries are available to compare yet.',
  ]

  return {
    totalSpend,
    monthlySeries: [...monthly.entries()].map(([label, total]) => ({ label, total })),
    yearlySeries: [...yearly.entries()].map(([label, total]) => ({ label, total })),
    topCategories,
    suggestions,
    biggestCategory,
    topMerchant,
  }
}
