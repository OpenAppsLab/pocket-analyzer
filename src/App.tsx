<<<<<<< HEAD
import { UploadPage } from './pages/UploadPage'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <UploadPage />
    </div>
  )
}

export default App
=======
import { useEffect, useMemo, useRef, useState } from 'react';

type Tx = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  source: string;
  type: 'income' | 'expense';
  raw?: string;
  isCreditCard?: boolean;
};

type CategoryRule = { name: string; cls: string; patterns: RegExp[] };

type FilterState = {
  query: string;
  category: string;
  source: string;
  dateFrom: string;
  dateTo: string;
};

type Toast = { id: number; msg: string; type: 'success' | 'error' | 'info' };

type SimilarModal = {
  sourceTx: Tx;
  newCategoryName: string;
  similarTxs: Tx[];
};

const CATEGORIES: CategoryRule[] = [
  { name: 'Fuel', cls: 'cat-fuel', patterns: [/7.?eleven/i, /liberty/i, /caltex/i, /bp /i, /shell/i, /ampol/i, /petrol/i, /fuel/i, /puma/i, /united petro/i] },
  { name: 'Food & Dining', cls: 'cat-food', patterns: [/gol gappa/i, /coles/i, /woolworths/i, /aldi/i, /bakery/i, /gyg/i, /guzman/i, /kfc/i, /mcdonald/i, /hungry jacks/i, /subway/i, /nandos/i, /pizza/i, /sushi/i, /torrefazione/i, /misterbean/i, /mister bean/i, /swades/i, /sunlit asian/i, /country market/i, /lawnton.*market/i, /fruit barn/i, /oche/i, /coffee/i, /espresso/i, /cafe/i, /restaurant/i, /balti/i, /food/i, /asian super/i, /dco strathpine/i] },
  { name: 'Shopping', cls: 'cat-shopping', patterns: [/afterpay/i, /officeworks/i, /ikea/i, /ebay/i, /amazon/i, /target/i, /kmart/i, /big w/i, /harvey norman/i, /jb hi.fi/i, /innovative retail/i, /pricebus/i, /bargain/i, /westfield/i] },
  { name: 'Health', cls: 'cat-health', patterns: [/specsavers/i, /pharmacy/i, /chemist/i, /doctor/i, /medical/i, /health/i, /bupa/i, /medibank/i, /mcare/i, /hospital/i] },
  { name: 'Entertainment', cls: 'cat-entertainment', patterns: [/event cinema/i, /warner bros/i, /dreamworld/i, /skypoint/i, /grouptogether/i, /mater lotteries/i, /tatts/i, /lottery/i, /cinema/i, /netflix/i, /spotify/i, /steam/i, /gaming/i, /nextra/i, /washngo/i] },
  { name: 'Aquatics/Sport', cls: 'cat-health', patterns: [/lawnton aquatic/i, /aquatic/i, /dbs*lawnton/i, /gym/i, /fitness/i, /skx brisbane/i, /99bikes/i] },
  { name: 'Transport', cls: 'cat-transport', patterns: [/translink/i, /uber/i, /ola/i, /didi/i, /taxi/i, /go card/i, /bus/i, /train/i, /parking/i] },
  { name: 'Utilities', cls: 'cat-utilities', patterns: [/telstra/i, /optus/i, /vodafone/i, /alinta/i, /energex/i, /origin/i, /agl/i, /electricity/i, /water/i, /internet/i, /flick/i, /bpay/i] },
  { name: 'Insurance', cls: 'cat-insurance', patterns: [/allianz/i, /bupa/i, /nrma/i, /racq/i, /insurance/i, /insure/i] },
  { name: 'Crypto', cls: 'cat-crypto', patterns: [/swyftx/i, /coinspot/i, /binance/i, /crypto/i, /bitcoin/i] },
  { name: 'Council Rates', cls: 'cat-rates', patterns: [/mbcc rates/i, /council/i, /rates/i] },
  { name: 'Education', cls: 'cat-education', patterns: [/st paul/i, /school/i, /tafe/i, /university/i, /education/i, /tuition/i] },
  { name: 'Home & Garden', cls: 'cat-home', patterns: [/josh donaldson/i, /pita.*mow/i, /mowing/i, /garden/i, /bunnings/i, /total tools/i, /plumb/i, /electr/i, /paint/i, /hardware/i] },
  { name: 'Home Loan', cls: 'cat-homeloan', patterns: [/home\s?loan/i, /mortgage/i, /loan repayment/i, /loan redraw/i, /housing loan/i, /redraw/i] },
  { name: 'Credit Card', cls: 'cat-creditcard', patterns: [/28 degrees.*direct debit/i, /direct debit.*28 degrees/i, /credit card payment/i, /card repayment/i, /online account payment/i, /28 degrees mastercard/i] },
  { name: 'Fees & Charges', cls: 'cat-fees', patterns: [/credit card fee/i, /account fee/i, /late fee/i, /dishonour/i, /annual fee/i, /wu d/i, /western union/i, /remittance/i] },
  { name: 'Subscriptions', cls: 'cat-subscription', patterns: [/microsoft/i, /apple/i, /google/i, /adobe/i, /canva/i, /dropbox/i, /icloud/i, /prime/i, /disney/i, /stan.com/i] },
  { name: 'Income', cls: 'cat-income', patterns: [/salary/i, /hub24/i, /payroll/i, /income/i, /ioo payment/i] },
  { name: 'Transfer', cls: 'cat-transfer', patterns: [/transfer/i, /osko/i] },
];

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const PAGE_SIZE = 50;
const MERCHANT_STOPWORDS = new Set([
  'pty', 'pty.', 'ltd', 'ltd.', 'lt', 'llc', 'inc', 'inc.', 'limited', 'co', 'corp', 'aus', 'au', 'australia', 'the', 'store', 'shop', 'group', 'holdings'
]);

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
}

function fmtDate(date: Date) {
  return new Intl.DateTimeFormat('en-AU').format(date);
}

function escHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] as string));
}

function parseDate(raw: string) {
  const s = raw.trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}

function splitCSVLine(line: string) {
  const result: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQ = !inQ; continue; }
    if (line[i] === ',' && !inQ) { result.push(cur); cur = ''; continue; }
    cur += line[i];
  }
  result.push(cur);
  return result;
}

function normalizeMerchant(desc: string) {
  return (desc || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !MERCHANT_STOPWORDS.has(w) && !/^\d+$/.test(w))
    .join(' ')
    .trim();
}

function merchantSimilarity(descA: string, descB: string) {
  const wordsA = new Set(normalizeMerchant(descA).split(' ').filter(Boolean));
  const wordsB = new Set(normalizeMerchant(descB).split(' ').filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  return common / Math.max(wordsA.size, wordsB.size);
}

function getCategory(tx: Tx, overrides: Record<string, string>) {
  const override = overrides[tx.id];
  if (override) {
    const found = CATEGORIES.find((c) => c.name === override);
    return found || { name: override, cls: 'cat-other' };
  }
  return categorise(tx.description);
}

function categorise(desc: string) {
  const d = desc.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.patterns.some((p) => p.test(d))) return cat;
  }
  return { name: 'Other', cls: 'cat-other' };
}

function isOwnTransfer(desc: string, source: string) {
  const d = (desc || '').toLowerCase();
  if (/transfer (to|from) xxd{4}/i.test(d) || /internal transfer/i.test(d) || /savings maximiser/i.test(d) || /osko deposit.*srinivasa kandukuri venkata/i.test(d) || /osko payment.*transfer to s(rinivasa)? kandukuri/i.test(d) || /transfer (to|from) srinivasa (raviteja )?kandukuri/i.test(d) || /transfer (to|from) durga (sowmya )?mangipudi/i.test(d) || /fast transfer from mr srinivasa raviteja/i.test(d) || /fast transfer from durga mangipudi/i.test(d) || /transfer from xxd{4}/i.test(d) || /online account payment/i.test(d)) return true;
  return false;
}

function isTransferLike(tx: Tx) {
  const d = (tx.description || '').toLowerCase();
  return /transfer|osko|internal|payment to|payment from|direct debit.*(card|mastercard)/i.test(d);
}

function readBuffer(file: File) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function readText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function extractYearCandidates(text: string) {
  const years = new Set<number>();
  const re = /\b(20\d{2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) years.add(parseInt(m[1], 10));
  return [...years].sort((a, b) => a - b);
}

function parseFlexibleDate(raw: string, yearCandidates: number[]) {
  if (!raw) return null;
  const s = raw.trim().replace(/,/g, '');
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (m) return new Date(2000 + +m[3], +m[2] - 1, +m[1]);
  m = s.match(new RegExp(`^(\\d{1,2})\\s+(${MONTHS_RE})\\s+(\\d{4})$`, 'i'));
  if (m) { const mo = MONTHS[m[2].toLowerCase().slice(0, 3)]; if (mo !== undefined) return new Date(+m[3], mo, +m[1]); }
  m = s.match(new RegExp(`^(\\d{1,2})\\s+(${MONTHS_RE})$`, 'i'));
  if (m) { const mo = MONTHS[m[2].toLowerCase().slice(0, 3)]; if (mo !== undefined) return resolveYearlessDate(+m[1], mo, yearCandidates); }
  m = s.match(new RegExp(`^(${MONTHS_RE})\\s+(\\d{1,2})\\s+(\\d{4})$`, 'i'));
  if (m) { const mo = MONTHS[m[1].toLowerCase().slice(0, 3)]; if (mo !== undefined) return new Date(+m[3], mo, +m[2]); }
  m = s.match(new RegExp(`^(${MONTHS_RE})\\s+(\\d{1,2})$`, 'i'));
  if (m) { const mo = MONTHS[m[1].toLowerCase().slice(0, 3)]; if (mo !== undefined) return resolveYearlessDate(+m[2], mo, yearCandidates); }
  return null;
}

function resolveYearlessDate(day: number, month: number, yearCandidates: number[]) {
  if (!yearCandidates || yearCandidates.length === 0) return new Date(new Date().getFullYear(), month, day);
  if (yearCandidates.length === 1) return new Date(yearCandidates[0], month, day);
  const sorted = yearCandidates.slice().sort((a, b) => a - b);
  if (month >= 10) return new Date(sorted[0], month, day);
  return new Date(sorted[sorted.length - 1], month, day);
}

const MONTHS_RE = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';

function parseUniversal(text: string, filename: string) {
  const txs: Tx[] = [];
  const rawLines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const yearCandidates = extractYearCandidates(text);
  const creditCardMode = /minimum payment due|flybuys|annual\s*%\s*rate|cash advances?|purchases\s+\d+\.\d\d\s*%|credit card statement/i.test(text);
  let lastBalance: number | null = null;
  let lastBalanceKnown = false;
  const UNIV_MONEY_RE = /-?\(?\$?\s?-?\d{1,3}(?:,\d{3})*\.\d{2}\)?\s?(?:DR|CR)?/gi;
  const UNIV_DATE_START_RE = new RegExp(
    '^(' + '\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4}' + '|' + '\\d{1,2}\\s+(?:' + MONTHS_RE + ')\\s+\\d{4}' + '|' + '\\d{1,2}\\s+(?:' + MONTHS_RE + ')(?=\\s|$)' + '|' + '(?:' + MONTHS_RE + ')\\s+\\d{1,2}(?:\\s+\\d{4})?(?=\\s|$)' + ')', 'i'
  );

  const txsByLine: Array<{ date: string; desc: string; amount: string; balance: string }> = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!UNIV_DATE_START_RE.test(line)) continue;
    const date = line.match(UNIV_DATE_START_RE)?.[1] || '';
    const after = rawLines.slice(i + 1, i + 6).join(' ');
    const moneyMatches = Array.from(after.matchAll(UNIV_MONEY_RE)).map((m) => m[0]);
    if (moneyMatches.length < 2) continue;
    const last = moneyMatches[moneyMatches.length - 1];
    const balance = parseMoneyToken(last);
    if (!Number.isNaN(balance)) {
      const amount = parseMoneyToken(moneyMatches[0] || '0');
      const desc = after.replace(UNIV_MONEY_RE, '').replace(/\s+/g, ' ').trim();
      txsByLine.push({ date, desc, amount: String(amount), balance: String(balance) });
    }
  }

  for (const item of txsByLine) {
    const date = parseFlexibleDate(item.date, yearCandidates);
    if (!date) continue;
    const amount = parseFloat(item.amount);
    if (!Number.isFinite(amount)) continue;
    const sign = creditCardMode ? (amount >= 0 ? -1 : 1) : amount;
    const tx: Tx = {
      id: `tx_${Math.random().toString(36).slice(2)}`,
      date,
      description: item.desc || 'Transaction',
      amount: (sign < 0 ? -Math.abs(sign) : Math.abs(sign)),
      source: filename.replace(/\.[^.]+$/, '').replace(/[_\-]+/g, ' ').trim() || 'Bank Statement',
      type: sign < 0 ? 'expense' : 'income',
    };
    txs.push(tx);
  }

  if (txs.length === 0) {
    for (const line of rawLines) {
      const date = line.match(UNIV_DATE_START_RE)?.[1];
      if (!date) continue;
      const amountMatch = line.match(/(-?\$?\d{1,3}(?:,\d{3})*\.\d{2})/);
      const amount = amountMatch ? parseMoneyToken(amountMatch[1]) : NaN;
      if (Number.isNaN(amount)) continue;
      txs.push({
        id: `tx_${Math.random().toString(36).slice(2)}`,
        date: parseFlexibleDate(date, yearCandidates) || new Date(),
        description: line.replace(date, '').replace(amountMatch?.[1] || '', '').replace(/\s+/g, ' ').trim() || 'Transaction',
        amount: creditCardMode ? (amount >= 0 ? -Math.abs(amount) : Math.abs(amount)) : amount,
        source: filename.replace(/\.[^.]+$/, '').replace(/[_\-]+/g, ' ').trim() || 'Bank Statement',
        type: amount < 0 ? 'expense' : 'income',
      });
    }
  }

  return txs;
}

function parseMoneyToken(tok: string) {
  let s = tok.trim();
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/DR\s*$/i.test(s)) { neg = true; s = s.replace(/DR\s*$/i, ''); }
  if (/CR\s*$/i.test(s)) { s = s.replace(/CR\s*$/i, ''); }
  s = s.replace(/[\$\s]/g, '');
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }
  s = s.replace(/,/g, '');
  const val = parseFloat(s);
  if (Number.isNaN(val)) return NaN;
  return neg ? -val : val;
}

function parse28Degrees(text: string, filename: string): Tx[] {
  const txs: Tx[] = [];
  const combined = text.split('\n').join(' ');
  const txPattern = /(\d{2}\/\d{2}\/\d{4})\s+(\d{4})\s+([A-Za-z0-9\s\-\/\*\#\.&']+?)\s+((?:QLD|NSW|VIC|WA|SA|TAS|ACT|NT|Fee)?)\s*(\$[\d,]+\.\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = txPattern.exec(combined)) !== null) {
    const date = parseDate(m[1]);
    if (!date) continue;
    const desc = (m[3] + ' ' + (m[4] || '')).trim().replace(/\s+/g, ' ');
    const amountStr = m[5].replace(/[\$,]/g, '');
    txs.push({ id: `tx_${Math.random().toString(36).slice(2)}`, date, description: desc, amount: -parseFloat(amountStr), source: '28 Degrees', type: 'expense', isCreditCard: true, raw: m[0] });
  }
  const creditPattern = /(\d{2}\/\d{2}\/\d{4})\s+(\d{4})\s+OnlineAccountPayment\s+([\d,]+\.\d{2})/gi;
  while ((m = creditPattern.exec(combined)) !== null) {
    const date = parseDate(m[1]);
    if (!date) continue;
    txs.push({ id: `tx_${Math.random().toString(36).slice(2)}`, date, description: 'Online Account Payment', amount: parseFloat(m[3].replace(/,/g, '')), source: '28 Degrees', type: 'income', isCreditCard: true, raw: m[0] });
  }
  return txs;
}

function parseINGOrange(text: string): Tx[] {
  const txs: Tx[] = [];
  const combined = text.replace(/\s*\|[^|]*\|\s*/g, ' ').replace(/[ \t]+/g, ' ');
  const ingTxPattern = /(\d{2}\/\d{2}\/\d{4})\s+(?:Visa Purchase|EFTPOS Purchase|Intl Atmpurchase|Direct Debit|Osko (?:Deposit|Payment)|Internal Transfer|Deposit|Force Post No Funds|Reversal Direct Debit|Intl Transaction Fee(?! Rebate)).*?(-?[\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = ingTxPattern.exec(combined)) !== null) {
    const date = parseDate(m[1]);
    if (!date) continue;
    const moneyOut = parseFloat(m[2].replace(/,/g, ''));
    const key = m[0].substring(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    const afterMatch = combined.substring(m.index + m[0].length, m.index + m[0].length + 200);
    const merchantMatch = afterMatch.match(/^\s*([A-Za-z0-9\s\*\-\.#&'/,]+?)(?=\d{2}\/\d{2}\/\d{4}|---PAGE---|Receipt|Date \d|$)/);
    const merchant = merchantMatch ? merchantMatch[1].trim().replace(/\s+/g, ' ').substring(0, 50) : '';
    const typeMatch = m[0].match(/(Visa Purchase|EFTPOS Purchase|Intl Atmpurchase|Direct Debit|Osko (?:Deposit|Payment)|Internal Transfer|Deposit|Force Post No Funds|Reversal Direct Debit|Intl Transaction Fee)/i);
    const txType = typeMatch ? typeMatch[1] : 'Purchase';
    txs.push({ id: `tx_${Math.random().toString(36).slice(2)}`, date, description: (merchant || txType).trim(), amount: moneyOut, source: 'ING Orange', type: moneyOut < 0 ? 'expense' : 'income', raw: m[0] });
  }
  return txs;
}

function parseCommBankSaver(text: string): Tx[] {
  const txs: Tx[] = [];
  const pattern = /(\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s+([^\$\-]+?)\s+(-?\$[\d,]+\.\d{2})\s+(-?\$[\d,]+\.\d{2})/gi;
  const combined = text.replace(/\s+/g, ' ');
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(combined)) !== null) {
    const date = parseDate(m[1].trim());
    if (!date) continue;
    const desc = m[2].trim().replace(/\s+/g, ' ');
    const amountStr = m[3].replace(/[\$,]/g, '');
    const amount = parseFloat(amountStr);
    if (Number.isNaN(amount)) continue;
    txs.push({ id: `tx_${Math.random().toString(36).slice(2)}`, date, description: desc, amount, source: 'CommBank Saver', type: amount < 0 ? 'expense' : 'income', raw: m[0] });
  }
  return txs;
}

function parseCommBankCSV(text: string, filename: string): Tx[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const txs: Tx[] = [];
  for (const line of lines) {
    const parts = splitCSVLine(line);
    if (parts.length < 3) continue;
    const dateStr = parts[0].replace(/"/g, '').trim();
    const amountStr = parts[1].replace(/"/g, '').trim();
    const desc = parts[2].replace(/"/g, '').trim();
    const date = parseDate(dateStr);
    if (!date) continue;
    const amount = parseFloat(amountStr);
    if (Number.isNaN(amount)) continue;
    txs.push({ id: `tx_${Math.random().toString(36).slice(2)}`, date, description: desc, amount, source: 'CommBank (Ravi)', type: amount > 0 ? 'income' : 'expense', raw: line });
  }
  return txs;
}

function parsePDF(text: string, filename: string) {
  const fn = filename.toLowerCase();
  if (fn.includes('28') || fn.includes('degrees') || fn.includes('june_2026') || fn.includes('statement')) {
    const r = parse28Degrees(text, filename);
    if (r.length > 0) return r;
  }
  if (fn.includes('orange') || fn.includes('ing') || fn.includes('everyday')) {
    const r = parseINGOrange(text);
    if (r.length > 0) return r;
  }
  if (fn.includes('ravi') || fn.includes('goalsaver') || fn.includes('education') || fn.includes('transaction')) {
    const r = parseCommBankSaver(text);
    if (r.length > 0) return r;
  }
  let r = parseUniversal(text, filename);
  if (r.length > 0) return r;
  r = parse28Degrees(text, filename);
  if (r.length > 0) return r;
  r = parseINGOrange(text);
  if (r.length > 0) return r;
  return parseCommBankSaver(text);
}

function detectRoundTripTransfers(items: Tx[]) {
  const candidates = items.filter(isTransferLike);
  const toRemove = new Set<Tx>();
  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i];
    if (toRemove.has(a)) continue;
    for (let j = i + 1; j < candidates.length; j++) {
      const b = candidates[j];
      if (toRemove.has(b)) continue;
      if (a.source === b.source) continue;
      if (Math.sign(a.amount) === Math.sign(b.amount)) continue;
      if (Math.abs(Math.abs(a.amount) - Math.abs(b.amount)) > 0.01) continue;
      const dayDiff = Math.abs((a.date.getTime() - b.date.getTime()) / 86400000);
      if (dayDiff > 3) continue;
      toRemove.add(a);
      toRemove.add(b);
      break;
    }
  }
  return toRemove;
}

const allCategoryNames = [...CATEGORIES.map((c) => c.name), 'Other'];

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [screen, setScreen] = useState<'upload' | 'dashboard'>('upload');
  const [fileChips, setFileChips] = useState<Array<{ id: string; name: string; status: 'pending' | 'ok' | 'err'; label: string }>>([]);
  const [allTransactions, setAllTransactions] = useState<Tx[]>([]);
  const [ignoredTransactions, setIgnoredTransactions] = useState<Tx[]>([]);
  const [filteredTx, setFilteredTx] = useState<Tx[]>([]);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [sortCol, setSortCol] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [filters, setFilters] = useState<FilterState>({ query: '', category: '', source: '', dateFrom: '', dateTo: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [similarModal, setSimilarModal] = useState<SimilarModal | null>(null);
  const [pendingSimilarIds, setPendingSimilarIds] = useState<string[]>([]);
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);
  const [txIdCounter, setTxIdCounter] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const toast = (msg: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random();
    const next: Toast = { id, msg, type };
    setToasts((prev) => [...prev, next]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const addFileChip = (name: string, status: 'pending' | 'ok' | 'err', label: string) => {
    const chip = { id: `chip-${name.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}`, name, status, label };
    setFileChips((prev) => [...prev, chip]);
    return chip;
  };

  const updateChip = (id: string, status: 'pending' | 'ok' | 'err', label: string) => {
    setFileChips((prev) => prev.map((chip) => chip.id === id ? { ...chip, status, label } : chip));
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      if (loadedFiles.includes(file.name)) { toast(`${file.name} already loaded`, 'info'); continue; }
      setLoadedFiles((prev) => [...prev, file.name]);
      const chip = addFileChip(file.name, 'pending', '…');
      try {
        let txs: Tx[] = [];
        if (file.name.toLowerCase().endsWith('.csv')) {
          const text = await readText(file);
          txs = parseCommBankCSV(text, file.name);
        } else if (file.name.toLowerCase().endsWith('.pdf')) {
          const buffer = await readBuffer(file);
          const pdfjs = await loadPDFJS();
          const pdf = await pdfjs.getDocument({ data: buffer }).promise;
          let fullText = '';
          for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            const items = content.items.slice().sort((a: any, b: any) => {
              const dy = Math.round(b.transform[5]) - Math.round(a.transform[5]);
              if (Math.abs(dy) > 3) return dy;
              return a.transform[4] - b.transform[4];
            });
            let lastY: number | null = null;
            for (const item of items) {
              const y = Math.round(item.transform[5]);
              if (lastY !== null && Math.abs(y - lastY) > 3) fullText += '\n';
              fullText += item.str + ' ';
              lastY = y;
            }
            fullText += '\n---PAGE---\n';
          }
          txs = parsePDF(fullText, file.name);
        }
        if (txs.length === 0) {
          updateChip(chip.id, 'err', '0 tx');
          toast(`No transactions found in ${file.name}`, 'error');
        } else {
          const real: Tx[] = [];
          const ignored: Tx[] = [];
          for (const tx of txs) {
            tx.id = `tx_${txIdCounter + Math.random().toString(36).slice(2)}`;
            if (isOwnTransfer(tx.description, tx.source)) ignored.push(tx);
            else real.push(tx);
          }
          setTxIdCounter((prev) => prev + txs.length);
          setAllTransactions((prev) => [...prev, ...real]);
          setIgnoredTransactions((prev) => [...prev, ...ignored]);
          updateChip(chip.id, 'ok', `${real.length} tx`);
          toast(`Loaded ${file.name}: ${real.length} transactions (${ignored.length} own-transfers excluded)`, 'success');
        }
      } catch (e: any) {
        updateChip(chip.id, 'err', 'Error');
        toast(`Error parsing ${file.name}: ${e?.message || e}`, 'error');
      }
    }
    const roundTrip = detectRoundTripTransfers(allTransactions);
    if (roundTrip.size > 0) {
      const filtered = allTransactions.filter((tx) => !roundTrip.has(tx));
      const paired = [...roundTrip];
      setAllTransactions(filtered);
      setIgnoredTransactions((prev) => [...prev, ...paired]);
      toast(`Excluded ${paired.length} matched transfer transactions`, 'info');
    }
  };

  const applyFilters = (page = 1) => {
    const search = filters.query.toLowerCase();
    const filtered = allTransactions.filter((tx) => {
      const cat = getCategory(tx, categoryOverrides);
      const description = tx.description.toLowerCase();
      const matchesSearch = !search || description.includes(search) || cat.name.toLowerCase().includes(search);
      const matchesCategory = !filters.category || cat.name === filters.category;
      const matchesSource = !filters.source || tx.source === filters.source;
      const matchesType = typeFilter === 'all' || tx.type === typeFilter;
      const matchesDateFrom = !filters.dateFrom || tx.date >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || tx.date <= new Date(`${filters.dateTo}T23:59:59`);
      return matchesSearch && matchesCategory && matchesSource && matchesType && matchesDateFrom && matchesDateTo;
    });

    const sorted = filtered.sort((a, b) => {
      if (sortCol === 'date') {
        const diff = a.date.getTime() - b.date.getTime();
        return sortDir === 'asc' ? diff : -diff;
      }
      const diff = a.amount - b.amount;
      return sortDir === 'asc' ? diff : -diff;
    });

    setCurrentPage(page);
    setFilteredTx(sorted);
  };

  useEffect(() => {
    applyFilters(currentPage);
  }, [allTransactions, categoryOverrides, filters, sortCol, sortDir, typeFilter]);

  const pagedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTx.slice(start, start + PAGE_SIZE);
  }, [filteredTx, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredTx.length / PAGE_SIZE));

  const stats = useMemo(() => {
    const totalSpend = allTransactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalIncome = allTransactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
    const net = totalIncome - totalSpend;
    const topExpense = [...allTransactions].filter((tx) => tx.amount < 0).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
    return { totalSpend, totalIncome, net, topExpense };
  }, [allTransactions]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of allTransactions) {
      if (tx.amount >= 0) continue;
      const cat = getCategory(tx, categoryOverrides).name;
      map.set(cat, (map.get(cat) || 0) + Math.abs(tx.amount));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [allTransactions, categoryOverrides]);

  const merchantTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of allTransactions) {
      if (tx.amount >= 0) continue;
      const key = tx.description;
      map.set(key, (map.get(key) || 0) + Math.abs(tx.amount));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [allTransactions]);

  const monthlyTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of allTransactions) {
      if (tx.amount >= 0) continue;
      const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + Math.abs(tx.amount));
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [allTransactions]);

  const incomeExpenseMonthly = useMemo(() => {
    const grouped = new Map<string, { income: number; expense: number }>();
    for (const tx of allTransactions) {
      const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      const entry = grouped.get(key) || { income: 0, expense: 0 };
      if (tx.amount > 0) entry.income += tx.amount;
      else entry.expense += Math.abs(tx.amount);
      grouped.set(key, entry);
    }
    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [allTransactions]);

  const insights = useMemo(() => {
    const list: string[] = [];
    if (stats.totalSpend > 0) list.push(`You spent ${formatMoney(stats.totalSpend)} across ${allTransactions.length} transactions.`);
    if (categoryTotals.length > 0) list.push(`Top category is ${categoryTotals[0][0]} at ${formatMoney(categoryTotals[0][1])}.`);
    if (stats.topExpense) list.push(`Largest expense was ${stats.topExpense.description} for ${formatMoney(Math.abs(stats.topExpense.amount))}.`);
    if (allTransactions.length === 0) list.push('Upload a CSV or PDF statement to start your analysis.');
    return list;
  }, [stats, categoryTotals, allTransactions]);

  const sourceOptions = useMemo(() => Array.from(new Set(allTransactions.map((tx) => tx.source))), [allTransactions]);

  const findSimilarTransactions = (tx: Tx, newCategoryName: string) => {
    return allTransactions.filter((candidate) => {
      if (candidate.id === tx.id) return false;
      if (getCategory(candidate, categoryOverrides).name === newCategoryName) return false;
      return merchantSimilarity(candidate.description, tx.description) >= 0.6;
    });
  };

  const requestCategoryChange = (txId: string, newCategoryName: string) => {
    setCategoryOverrides((prev) => ({ ...prev, [txId]: newCategoryName }));
    toast(`Moved to "${newCategoryName}"`, 'success');
    const tx = allTransactions.find((item) => item.id === txId);
    if (!tx) return;
    const similar = findSimilarTransactions(tx, newCategoryName);
    if (similar.length > 0) {
      setSimilarModal({ sourceTx: tx, newCategoryName, similarTxs: similar });
      setPendingSimilarIds(similar.map((t) => t.id));
    }
  };

  const applySimilarTxCategory = (newCategoryName: string) => {
    const nextOverrides = { ...categoryOverrides };
    for (const id of pendingSimilarIds) nextOverrides[id] = newCategoryName;
    setCategoryOverrides(nextOverrides);
    setSimilarModal(null);
    setPendingSimilarIds([]);
    toast(`Moved ${pendingSimilarIds.length} similar transaction${pendingSimilarIds.length > 1 ? 's' : ''} to "${newCategoryName}"`, 'success');
  };

  const closeSimilarModal = () => {
    setSimilarModal(null);
    setPendingSimilarIds([]);
  };

  const changeSorting = (column: 'date' | 'amount') => {
    if (sortCol === column) setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setSortCol(column);
      setSortDir(column === 'date' ? 'desc' : 'asc');
    }
  };

  const renderRows = pagedTransactions.map((tx) => {
    const category = getCategory(tx, categoryOverrides);
    const amountClass = tx.amount < 0 ? 'amount-out' : 'amount-in';
    const amountPrefix = tx.amount < 0 ? '–' : '+';
    return (
      <tr key={tx.id}>
        <td className="date-cell">{fmtDate(tx.date)}</td>
        <td className="desc-cell">
          <div className="desc-main" title={tx.description}>{tx.description}</div>
          <div className="desc-sub">{tx.source}</div>
        </td>
        <td>
          <select className={`cat-select ${category.cls}`} value={category.name} onChange={(e) => requestCategoryChange(tx.id, e.target.value)}>
            {allCategoryNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </td>
        <td><span className="source-tag">{tx.source}</span></td>
        <td className={amountClass}>{amountPrefix}{formatMoney(Math.abs(tx.amount))}</td>
      </tr>
    );
  });

  const renderBarChart = (entries: [string, number][]) => (
    <div className="bar-chart">
      {entries.slice(0, 6).map(([label, value]) => (
        <div className="bar-row" key={label}>
          <div className="bar-label">{label}</div>
          <div className="bar-outer">
            <div className="bar-inner" style={{ width: `${Math.max(10, (value / Math.max(...entries.map(([,v]) => v), 1)) * 100)}%`, background: 'linear-gradient(90deg, #6c63ff, #00d4aa)' }} />
          </div>
          <div className="bar-amount">{formatMoney(value)}</div>
        </div>
      ))}
    </div>
  );

  const renderMonthlyBars = () => (
    <div className="monthly-bars">
      {monthlyTotals.map(([key, value], idx) => (
        <div className="month-col" key={key}>
          <div className="month-bar" style={{ height: `${Math.max(6, (value / Math.max(...monthlyTotals.map(([,v]) => v), 1)) * 100)}%`, background: 'linear-gradient(180deg, #00d4aa, #6c63ff)' }} />
          <div className="month-lbl">{key.slice(5)}</div>
        </div>
      ))}
    </div>
  );

  const renderIncomeExpense = () => (
    <div className="ie-bars">
      {incomeExpenseMonthly.map(([key, pair]) => (
        <div className="ie-col" key={key}>
          <div className="ie-bar-pair">
            <div className="ie-bar income" style={{ height: `${Math.max(6, (pair.income / Math.max(...incomeExpenseMonthly.map(([,p]) => p.income), 1)) * 100)}%` }} />
            <div className="ie-bar expense" style={{ height: `${Math.max(6, (pair.expense / Math.max(...incomeExpenseMonthly.map(([,p]) => p.expense), 1)) * 100)}%` }} />
          </div>
          <div className="ie-lbl">{key.slice(5)}</div>
        </div>
      ))}
    </div>
  );

  const totalRows = filteredTx.length;

  return (
    <>
      <div className="toast-container">
        {toasts.map((toastItem) => (
          <div key={toastItem.id} className={`toast ${toastItem.type}`}>{toastItem.msg}</div>
        ))}
      </div>
      {similarModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>🔎 Similar transactions found</h3>
            <p className="modal-desc">Found <strong>{similarModal.similarTxs.length}</strong> other transaction{similarModal.similarTxs.length > 1 ? 's' : ''} that look like the same merchant as "{escHtml(similarModal.sourceTx.description)}". Move {similarModal.similarTxs.length > 1 ? 'them' : 'it'} to <strong>{escHtml(similarModal.newCategoryName)}</strong> too?</p>
            <div className="modal-tx-list">
              {similarModal.similarTxs.map((t) => (
                <div className="modal-tx-item" key={t.id}>
                  <div className="modal-tx-info">
                    <div className="modal-tx-desc" title={t.description}>{t.description}</div>
                    <div className="modal-tx-meta">{fmtDate(t.date)} · {t.source}</div>
                  </div>
                  <div className={`modal-tx-amount ${t.amount < 0 ? 'amount-out' : 'amount-in'}`}>{t.amount < 0 ? '–' : '+'}{formatMoney(Math.abs(t.amount))}</div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-sm" onClick={closeSimilarModal}>No, just this one</button>
              <button className="btn btn-primary btn-sm" onClick={() => applySimilarTxCategory(similarModal.newCategoryName)}>Apply to all {similarModal.similarTxs.length}</button>
            </div>
          </div>
        </div>
      )}

      <div className="header">
        <div className="header-logo">💰</div>
        <h1>Pocket Analyser</h1>
        <span>Personal Finance Dashboard</span>
        <div className="header-right">
          <span className="badge-private">🔒 LOCAL ONLY</span>
        </div>
      </div>

      <div className="main">
        {screen === 'upload' && (
          <div id="upload-screen">
            <div className={`drop-zone ${dragOver ? 'drag-over' : ''}`} onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(Array.from(e.dataTransfer.files)); }} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onClick={() => fileInputRef.current?.click()}>
              <div className="drop-zone-icon">📂</div>
              <h2>Drop your bank files here</h2>
              <p>All processing happens locally in your browser — nothing is uploaded or sent anywhere.</p>
              <div className="formats">
                <span className="format-tag">📊 CSV</span>
                <span className="format-tag">📄 PDF</span>
              </div>
              <br />
              <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Choose Files</button>
              <input ref={fileInputRef} type="file" id="file-input" multiple accept=".csv,.pdf" onChange={(e) => handleFiles(Array.from(e.target.files || []))} />
            </div>

            {fileChips.length > 0 && <div className="file-list">{fileChips.map((chip) => <div key={chip.id} className="file-chip"><span className="file-icon">{chip.name.endsWith('.csv') ? '📊' : '📄'}</span><span className="file-name" title={chip.name}>{chip.name}</span><span className={`file-status status-${chip.status}`}>{chip.label}</span></div>)}</div>}

            {allTransactions.length > 0 && (
              <div style={{ marginBottom: 24, textAlign: 'right' }}>
                <button className="btn btn-primary" onClick={() => { setScreen('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Go to Summary Screen →</button>
              </div>
            )}
          </div>
        )}

        {screen === 'dashboard' && (
          <div id="dashboard">
            <div className="top-bar">
              <button className="btn btn-secondary btn-sm" onClick={() => setScreen('upload')}>← Back to Upload</button>
            </div>

            <div className="stats-row">
              <div className="stat-card expense">
                <div className="label">Total Spending</div>
                <div className="value">{formatMoney(stats.totalSpend)}</div>
                <div className="sub">{allTransactions.filter((tx) => tx.amount < 0).length} transactions</div>
              </div>
              <div className="stat-card income">
                <div className="label">Total Income</div>
                <div className="value">{formatMoney(stats.totalIncome)}</div>
                <div className="sub">{allTransactions.filter((tx) => tx.amount > 0).length} income items</div>
              </div>
              <div className="stat-card net">
                <div className="label">Net Flow</div>
                <div className="value">{formatMoney(stats.net)}</div>
                <div className="sub">{allTransactions.length > 0 ? `${allTransactions[0].date.getFullYear()}-${String(allTransactions[0].date.getMonth() + 1).padStart(2, '0')}` : '–'}</div>
              </div>
              <div className="stat-card" style={{ borderLeft: '3px solid var(--accent)' }}>
                <div className="label">Largest Expense</div>
                <div className="value" style={{ fontSize: 20 }}>
                  {stats.topExpense ? stats.topExpense.description : '–'}
                </div>
                <div className="sub">{stats.topExpense ? formatMoney(Math.abs(stats.topExpense.amount)) : '–'}</div>
              </div>
            </div>

            <div className="chart-card" style={{ marginBottom: 24 }}>
              <h3>💡 Insights</h3>
              <ul className="insights-list">
                {insights.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div className="charts-row">
              <div className="chart-card">
                <h3>Spending by Category</h3>
                {renderBarChart(categoryTotals)}
              </div>
              <div className="chart-card">
                <h3>Monthly Spending</h3>
                {renderMonthlyBars()}
              </div>
            </div>

            <div className="charts-row">
              <div className="chart-card">
                <h3>Income vs Expenses (Monthly)</h3>
                {renderIncomeExpense()}
              </div>
              <div className="chart-card">
                <h3>Top Merchants</h3>
                {renderBarChart(merchantTotals)}
              </div>
            </div>

            <div className="chart-card" style={{ marginBottom: 24 }}>
              <h3>Category Breakdown</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                {categoryTotals.slice(0, 6).map(([name, amount]) => (
                  <span key={name} className={`cat-badge ${CATEGORIES.find((c) => c.name === name)?.cls || 'cat-other'}`}>{name} · {formatMoney(amount)}</span>
                ))}
              </div>
            </div>

            <div className="table-wrap">
              <div className="table-header">
                <h3>Transactions</h3>
                <span className="tx-count">{filteredTx.length}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="export-btn" onClick={() => toast('Export not implemented in this React port yet', 'info')}>⬇ Export CSV</button>
                </div>
              </div>

              <div className="controls">
                <div className="control-group search-wrap">
                  <label>Search</label>
                  <input type="text" placeholder="Search descriptions…" value={filters.query} onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))} />
                </div>
                <div className="control-group">
                  <label>Category</label>
                  <select value={filters.category} onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}>
                    <option value="">All categories</option>
                    {allCategoryNames.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div className="control-group">
                  <label>Source</label>
                  <select value={filters.source} onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}>
                    <option value="">All accounts</option>
                    {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
                  </select>
                </div>
                <div className="control-group">
                  <label>Date from</label>
                  <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))} />
                </div>
                <div className="control-group">
                  <label>Date to</label>
                  <input type="date" value={filters.dateTo} onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))} />
                </div>
                <div className="controls-right">
                  <div className="control-group">
                    <label>Type</label>
                    <div className="filter-tabs">
                      {(['all', 'expense', 'income'] as const).map((tab) => (
                        <div key={tab} className={`filter-tab ${typeFilter === tab ? 'active' : ''}`} onClick={() => setTypeFilter(tab)}>{tab === 'all' ? 'All' : tab[0].toUpperCase() + tab.slice(1)}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => changeSorting('date')} className={sortCol === 'date' ? 'sorted' : ''}>Date <span className="sort-icon">{sortCol === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span></th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Source</th>
                      <th onClick={() => changeSorting('amount')} className={sortCol === 'amount' ? 'sorted' : ''}>Amount <span className="sort-icon">{sortCol === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span></th>
                    </tr>
                  </thead>
                  <tbody>{renderRows}</tbody>
                </table>
                {totalRows === 0 && <div className="no-results">No transactions match your filters.</div>}
              </div>

              <div className="pagination">
                <span>Showing {Math.min(filteredTx.length, (currentPage - 1) * PAGE_SIZE + 1)}–{Math.min(currentPage * PAGE_SIZE, filteredTx.length)} of {filteredTx.length}</span>
                <div className="page-btns">
                  <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Prev</button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i + 1} className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                  ))}
                  <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                </div>
              </div>
            </div>

            {ignoredTransactions.length > 0 && <div className="ignored-notice">{ignoredTransactions.length} own-account transfer items were excluded from the summary.</div>}
          </div>
        )}

        {allTransactions.length === 0 && screen === 'upload' && (
          <div className="empty">
            <div className="empty-icon">🔍</div>
            <p>No transactions found in the loaded files. Try a different file format.</p>
          </div>
        )}
      </div>
    </>
  );
}

async function loadPDFJS() {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  return new Promise<any>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve((window as any).pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
>>>>>>> 76cba7a (Updated  React TypeScript project setup)
