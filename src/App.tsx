import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import * as XLSX from 'xlsx'
import './App.css'
import { INITIAL_LIVING_EXPENSES } from './initialLivingExpenses'
import type { LivingExpenseTransaction } from './livingExpenseTypes'

type EntryType = 'asset' | 'liability'
type AssetCategory = 'cash' | 'deposit' | 'stock' | 'crypto' | 'real-estate' | 'retirement' | 'loan' | 'card'
type ViewMode = 'overview' | 'expenses'

type PortfolioEntry = {
  id: string
  type: EntryType
  category: AssetCategory
  name: string
  amount: number
  note: string
  updatedAt: string
}

type EntryDraft = Omit<PortfolioEntry, 'id' | 'updatedAt'>

type CategorySlice = {
  category: string
  amount: number
  share: number
  count: number
  color: string
}

type MonthlyExpense = {
  month: string
  total: number
  cardTotal: number
  bankTotal: number
  settlementTotal: number
  count: number
  dailyAverage: number
  categories: CategorySlice[]
  merchants: { name: string; amount: number; count: number }[]
  transactions: LivingExpenseTransaction[]
  settlements: LivingExpenseTransaction[]
}

const STORAGE_KEY = 'myfml-portfolio-v1'
const EXPENSE_STORAGE_KEY = 'myfml-living-expenses-v3'

const ASSET_CATEGORIES: AssetCategory[] = ['cash', 'deposit', 'stock', 'crypto', 'real-estate', 'retirement']
const LIABILITY_CATEGORIES: AssetCategory[] = ['loan', 'card']

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  cash: '현금',
  deposit: '예적금',
  stock: '주식/ETF',
  crypto: '가상자산',
  'real-estate': '부동산',
  retirement: '연금',
  loan: '대출',
  card: '카드/미지급금',
}

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  cash: '#31554a',
  deposit: '#477463',
  stock: '#1f5f8b',
  crypto: '#8f6542',
  'real-estate': '#b56a3b',
  retirement: '#527a51',
  loan: '#b34e3d',
  card: '#d2874a',
}

const EXPENSE_COLORS = ['#31554a', '#b56a3b', '#6f7f6c', '#8e5943', '#5f746b', '#c08a52', '#b34e3d', '#7d7467', '#a37a55', '#6c7278']

const INITIAL_DRAFT: EntryDraft = {
  type: 'asset',
  category: 'cash',
  name: '',
  amount: 0,
  note: '',
}

const SAMPLE_ENTRIES: PortfolioEntry[] = [
  { id: 'sample-asset-1', type: 'asset', category: 'cash', name: '생활비 통장', amount: 3200000, note: '매달 자동이체/생활비', updatedAt: '2026-04-22' },
  { id: 'sample-asset-2', type: 'asset', category: 'deposit', name: '비상금 적금', amount: 10000000, note: '6개월치 생활비 목표', updatedAt: '2026-04-22' },
  { id: 'sample-asset-3', type: 'asset', category: 'stock', name: '미국 ETF 계좌', amount: 18500000, note: '장기 투자', updatedAt: '2026-04-22' },
  { id: 'sample-debt-1', type: 'liability', category: 'loan', name: '전세대출', amount: 42000000, note: '고정금리', updatedAt: '2026-04-22' },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(amount)
}

function formatCompact(amount: number) {
  if (amount >= 100000000) return `${Math.round(amount / 100000000)}억`
  if (amount >= 10000) return `${Math.round(amount / 10000).toLocaleString('ko-KR')}만`
  return amount.toLocaleString('ko-KR')
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(date))
}

function normalizeDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }
  const text = String(value ?? '').trim()
  const match = text.match(/(\d{4})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/)
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : new Date().toISOString().slice(0, 10)
}

function numberFromCell(value: unknown) {
  if (typeof value === 'number') return Math.abs(value)
  return Math.abs(Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0)
}

function pickValue(row: Record<string, unknown>, candidates: string[]) {
  const key = Object.keys(row).find((rowKey) => candidates.some((candidate) => rowKey.includes(candidate)))
  return key ? row[key] : undefined
}

function categorizeExpense(description: string) {
  const text = description.replace(/\s+/g, ' ')
  if (/용돈|모친|부모님|혜진\s*용돈|혜진용돈|대현\s*용돈|대현용돈|박대현|이혜진/.test(text)) return '가족/용돈'
  if (/조의금|축의금|경조|생신|어버이날|세뱃돈|명절|답례/.test(text)) return '경조사/명절'
  if (/은진|곗돈|계모임|\s계\s|\s계$/.test(text)) return '계/모임'
  if (/택시|버스|평택버스|SR|SRT|코레일|철도|지하철|주유|충전소|에너지|하이플러스|하이패스|기아오토큐|오토큐|나이스파크|케이엠파크|파킹|주차|교통|티웨이|항공/.test(text)) return '교통/차량'
  if (/마트|슈퍼|FRESH|프레시|이마트|컬리|쿠팡|마켓|식품|정육|축산|코스트코|트레이더스|SSG|에스에스지|배달|우아한형제|롯데리아|카페|커피|스타벅스|맥도날드|파리바게뜨|뚜레쥬르|베이커리|디저트|설빙|갈비|통닭|짬뽕|보리밥|파스타|식당|푸드|치킨|피자|족발|분식|한식|일식|중식|편의점|CU|씨유|GS25|세븐|만두|홈플러스|김프로축산|제이앤비/.test(text)) return '식비/장보기'
  if (/병원|약국|의원|의료|헬스|건강|보험|화재|현대해상|메리츠|감염관리|치과|소아청/.test(text)) return '보험/의료'
  if (/네이버페이|온라인|쇼핑|몰|스토어|아마존|AMAZON|G마켓|지마켓|11번가|무신사|이랜드|이케아|다이소|올리브영|버킷플레이스|오늘의집|휠라|옷|가위|물티슈|인형/.test(text)) return '쇼핑/생활'
  if (/관리비|전기|가스|수도|통신|모바일|SKT|KT|LG U|아파트|월세|임대료|쿠쿠홈시스|정수기/.test(text)) return '주거/통신'
  if (/GAMSGO|구글|APPLE|넷플릭스|유튜브|멜론|구독|게임|문화|영화|서점|YES24|예스24|멤버십/.test(text)) return '구독/문화'
  if (/학원|교육|도서|문구|학교|어린이|키즈|토이|교구|아쿠아플라넷|육아|기저귀|분유|이유식|새봄/.test(text)) return '교육/육아'
  if (/헤어|미용|세탁|수선|쏘잉|로컬푸드|카카오|뽀득|컬리페이|비브로스/.test(text)) return '생활서비스'
  if (/삼성카드|스마일카드/.test(text)) return '카드결제(기타)'
  if (/대출|주택대출|대부금/.test(text)) return '대출'
  return '기타'
}

function isLikelyCardSettlement(description: string) {
  return /신한카드|신한\s*체크|신한\s*신용|카드대금|결제대금|카드결제|카드출금|카드 자동|카드자동|카드이용대금/.test(description)
}

function isExcludedBankWithdrawal(description: string, transactionKind = '', amount = 0, date = '') {
  if (/세이프박스/.test(description) || /세이프박스/.test(transactionKind)) return true
  if (/청약저축|청약\s*저축|금투자|저축|적금/.test(description)) return true

  const isOwnAccountTransfer = /계좌간자동이체|내\s*계좌|본인계좌|계좌간/.test(transactionKind)
  const isFixedCostFunding = /관리비|통신&구독|통신|구독|구독료|보험/.test(description)
  if (isOwnAccountTransfer && isFixedCostFunding) return true
  if (/(삼성카드|스마일카드|신한카드).*(관리비|통신|구독|유튜브|보험)/.test(description)) return true

  const day = date.slice(8, 10)
  const isNamedAllowance = /용돈|모친|부모님/.test(description)
  const isLargeIrregularParkTransfer = /박대현/.test(description) && amount >= 500000 && day !== '01' && !isNamedAllowance

  return isLargeIrregularParkTransfer
}

function normalizeExpense(transaction: LivingExpenseTransaction): LivingExpenseTransaction {
  if (transaction.source === 'settlement') return { ...transaction, category: '신한카드 결제대금' }
  return { ...transaction, category: categorizeExpense(transaction.description) }
}

function rowsWithDetectedHeaders(sheet: XLSX.WorkSheet) {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' })
  const headerIndex = matrix.findIndex((row) => {
    const joined = row.map((cell) => String(cell)).join('|')
    const looksCard = /거래일|이용일/.test(joined) && /가맹점|사용처|이용가맹점/.test(joined)
    const looksBank = /거래일|거래일시|일자/.test(joined) && /출금|지급|찾으신금액|거래금액/.test(joined)
    return looksCard || looksBank
  })

  if (headerIndex < 0) {
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, defval: '' })
  }

  const headers = matrix[headerIndex].map((cell, index) => String(cell || `__EMPTY_${index}`).trim())
  return matrix.slice(headerIndex + 1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
}

function parseWorkbookRows(workbook: XLSX.WorkBook, fileName: string) {
  const importedAt = Date.now()
  const parsed: LivingExpenseTransaction[] = []

  workbook.SheetNames.forEach((sheetName) => {
    const rows = rowsWithDetectedHeaders(workbook.Sheets[sheetName])

    rows.forEach((row, rowIndex) => {
      const cardDate = pickValue(row, ['거래일', '이용일'])
      const merchant = pickValue(row, ['가맹점명', '사용처', '이용가맹점'])
      const cardAmount = pickValue(row, ['금액', '이용금액', '승인금액'])
      const cancelStatus = String(pickValue(row, ['취소상태', '취소']) ?? '')

      if (merchant && cardAmount && !cancelStatus.includes('취소')) {
        const description = String(merchant).trim()
        parsed.push({ id: `upload-${importedAt}-${sheetName}-${rowIndex}`, date: normalizeDate(cardDate), source: 'card', description, amount: numberFromCell(cardAmount), category: categorizeExpense(description), memo: `${fileName} · 신한카드 명세` })
        return
      }

      const bankDate = pickValue(row, ['거래일시', '거래일', '일자'])
      const bankDescription = pickValue(row, ['내용', '적요', '거래내용', '받는분', '보낸분', '거래처'])
      const withdrawal = pickValue(row, ['출금액', '출금', '지급', '찾으신금액', '출금금액'])
      const deposit = pickValue(row, ['입금액', '입금', '맡기신금액', '입금금액'])
      const genericAmount = pickValue(row, ['거래금액', '금액'])
      const typeText = String(pickValue(row, ['구분', '거래구분', '입출금']) ?? '')
      const description = String(bankDescription ?? '').trim()
      const withdrawalAmount = numberFromCell(withdrawal ?? (typeText.includes('출금') ? genericAmount : undefined))
      const depositAmount = numberFromCell(deposit ?? (typeText.includes('입금') ? genericAmount : undefined))

      const transactionKind = String(pickValue(row, ['거래구분', '거래종류']) ?? '')

      const normalizedBankDate = normalizeDate(bankDate)

      if (!bankDate || !description || withdrawalAmount <= 0 || depositAmount > 0) return
      if (isExcludedBankWithdrawal(description, transactionKind, withdrawalAmount, normalizedBankDate)) return

      if (isLikelyCardSettlement(description)) {
        parsed.push({ id: `upload-${importedAt}-${sheetName}-${rowIndex}`, date: normalizedBankDate, source: 'settlement', description, amount: withdrawalAmount, category: '신한카드 결제대금', memo: `${fileName} · 통장 신한카드 결제대금(중복 제외)` })
        return
      }

      parsed.push({ id: `upload-${importedAt}-${sheetName}-${rowIndex}`, date: normalizedBankDate, source: 'bank', description, amount: withdrawalAmount, category: categorizeExpense(description), memo: `${fileName} · 통장 직접출금` })
    })
  })

  return parsed.filter((transaction) => transaction.amount > 0)
}

function readEntries() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return SAMPLE_ENTRIES
  try {
    const parsed = JSON.parse(raw) as PortfolioEntry[]
    return Array.isArray(parsed) ? parsed : SAMPLE_ENTRIES
  } catch {
    return SAMPLE_ENTRIES
  }
}

function readExpenses() {
  const raw = localStorage.getItem(EXPENSE_STORAGE_KEY)
  if (!raw) return INITIAL_LIVING_EXPENSES.map(normalizeExpense)
  try {
    const parsed = JSON.parse(raw) as LivingExpenseTransaction[]
    return Array.isArray(parsed) ? parsed.map(normalizeExpense) : INITIAL_LIVING_EXPENSES.map(normalizeExpense)
  } catch {
    return INITIAL_LIVING_EXPENSES.map(normalizeExpense)
  }
}

function getDaysInMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber, 0).getDate()
}

function groupMonthlyExpenses(expenses: LivingExpenseTransaction[]) {
  const map = new Map<string, LivingExpenseTransaction[]>()
  expenses.forEach((expense) => {
    const month = expense.date.slice(0, 7)
    map.set(month, [...(map.get(month) ?? []), expense])
  })

  return [...map.entries()]
    .map(([month, transactions]) => {
      const spendingTransactions = transactions.filter((transaction) => transaction.source !== 'settlement')
      const settlements = transactions.filter((transaction) => transaction.source === 'settlement')
      const total = spendingTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
      const categories = [...spendingTransactions.reduce((categoryMap, transaction) => {
        const current = categoryMap.get(transaction.category) ?? { amount: 0, count: 0 }
        categoryMap.set(transaction.category, { amount: current.amount + transaction.amount, count: current.count + 1 })
        return categoryMap
      }, new Map<string, { amount: number; count: number }>()).entries()]
        .map(([category, value], index) => ({ category, amount: value.amount, count: value.count, share: total === 0 ? 0 : Math.round((value.amount / total) * 100), color: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }))
        .sort((a, b) => b.amount - a.amount)
        .map((item, index) => ({ ...item, color: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }))

      const merchants = [...spendingTransactions.reduce((merchantMap, transaction) => {
        const key = transaction.description
        const current = merchantMap.get(key) ?? { amount: 0, count: 0 }
        merchantMap.set(key, { amount: current.amount + transaction.amount, count: current.count + 1 })
        return merchantMap
      }, new Map<string, { amount: number; count: number }>()).entries()]
        .map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      return {
        month,
        total,
        cardTotal: spendingTransactions.filter((transaction) => transaction.source === 'card').reduce((sum, transaction) => sum + transaction.amount, 0),
        bankTotal: spendingTransactions.filter((transaction) => transaction.source === 'bank').reduce((sum, transaction) => sum + transaction.amount, 0),
        settlementTotal: settlements.reduce((sum, transaction) => sum + transaction.amount, 0),
        count: spendingTransactions.length,
        dailyAverage: Math.round(total / getDaysInMonth(month)),
        categories,
        merchants,
        transactions: [...spendingTransactions].sort((a, b) => b.date.localeCompare(a.date)),
        settlements: [...settlements].sort((a, b) => b.date.localeCompare(a.date)),
      }
    })
    .sort((a, b) => b.month.localeCompare(a.month))
}

function DonutChart({ slices }: { slices: CategorySlice[] }) {
  const radius = 68
  const circumference = 2 * Math.PI * radius
  const segments = slices.reduce<{ slice: CategorySlice; dash: number; offset: number }[]>((accumulator, slice) => {
    const dash = (slice.share / 100) * circumference
    const offset = accumulator.reduce((sum, segment) => sum + segment.dash, 0)
    return [...accumulator, { slice, dash, offset }]
  }, [])

  return (
    <svg className="donut-chart" viewBox="0 0 180 180" role="img" aria-label="카테고리별 지출 원형 그래프">
      <circle cx="90" cy="90" r={radius} className="donut-track" />
      {segments.map(({ slice, dash, offset }) => (
        <circle key={slice.category} cx="90" cy="90" r={radius} className="donut-segment" stroke={slice.color} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} />
      ))}
      <text x="90" y="84" textAnchor="middle" className="donut-label">TOP</text>
      <text x="90" y="105" textAnchor="middle" className="donut-value">{slices[0]?.share ?? 0}%</text>
    </svg>
  )
}

function TrendChart({ months, activeMonth, onSelect }: { months: MonthlyExpense[]; activeMonth: string; onSelect: (month: string) => void }) {
  const chronological = [...months].reverse()
  const max = Math.max(...chronological.map((month) => month.total), 1)

  return (
    <div className="trend-chart" aria-label="월별 생활비 추이">
      {chronological.map((month) => (
        <button type="button" className={`trend-bar ${month.month === activeMonth ? 'active' : ''}`} key={month.month} onClick={() => onSelect(month.month)}>
          <span style={{ height: `${Math.max(12, (month.total / max) * 100)}%` }} />
          <small>{month.month.slice(5)}월</small>
        </button>
      ))}
    </div>
  )
}

function DailyFlowChart({ month }: { month?: MonthlyExpense }) {
  if (!month) return <div className="empty-chart">일별 데이터 없음</div>

  const days = getDaysInMonth(month.month)
  const dailyTotals = Array.from({ length: days }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    return month.transactions.filter((transaction) => transaction.date === `${month.month}-${day}`).reduce((sum, transaction) => sum + transaction.amount, 0)
  })
  const max = Math.max(...dailyTotals, 1)
  const points = dailyTotals.map((amount, index) => {
    const x = 16 + (index / Math.max(days - 1, 1)) * 288
    const y = 128 - (amount / max) * 104
    return `${x},${y}`
  }).join(' ')

  return (
    <svg className="daily-flow-chart" viewBox="0 0 320 150" role="img" aria-label="선택 월 일별 지출 흐름">
      <path d="M16 128 H304" className="chart-axis" />
      <polyline points={points} className="daily-flow-line" />
      {dailyTotals.map((amount, index) => amount > 0 ? <circle key={`${month.month}-${index}`} cx={16 + (index / Math.max(days - 1, 1)) * 288} cy={128 - (amount / max) * 104} r="3.5" className="daily-flow-dot" /> : null)}
      <text x="16" y="145" className="chart-caption">1일</text>
      <text x="304" y="145" textAnchor="end" className="chart-caption">{days}일</text>
    </svg>
  )
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [entries, setEntries] = useState<PortfolioEntry[]>(() => (typeof window === 'undefined' ? SAMPLE_ENTRIES : readEntries()))
  const [expenses, setExpenses] = useState<LivingExpenseTransaction[]>(() => (typeof window === 'undefined' ? INITIAL_LIVING_EXPENSES.map(normalizeExpense) : readExpenses()))
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [draft, setDraft] = useState<EntryDraft>(INITIAL_DRAFT)
  const backupInputRef = useRef<HTMLInputElement | null>(null)
  const expenseInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)), [entries])
  useEffect(() => localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses)), [expenses])

  const assets = useMemo(() => entries.filter((entry) => entry.type === 'asset').sort((a, b) => b.amount - a.amount), [entries])
  const liabilities = useMemo(() => entries.filter((entry) => entry.type === 'liability').sort((a, b) => b.amount - a.amount), [entries])
  const monthlyExpenses = useMemo(() => groupMonthlyExpenses(expenses), [expenses])
  const activeMonth = selectedMonth || monthlyExpenses[0]?.month || ''
  const activeMonthlyExpense = monthlyExpenses.find((month) => month.month === activeMonth)
  const previousMonthlyExpense = monthlyExpenses[monthlyExpenses.findIndex((month) => month.month === activeMonth) + 1]
  const monthDelta = activeMonthlyExpense && previousMonthlyExpense ? activeMonthlyExpense.total - previousMonthlyExpense.total : 0
  const monthDeltaRate = activeMonthlyExpense && previousMonthlyExpense && previousMonthlyExpense.total > 0 ? Math.round((monthDelta / previousMonthlyExpense.total) * 100) : 0

  const filteredTransactions = useMemo(() => {
    const transactions = activeMonthlyExpense?.transactions ?? []
    return selectedCategory === '전체' ? transactions : transactions.filter((transaction) => transaction.category === selectedCategory)
  }, [activeMonthlyExpense, selectedCategory])

  const expenseSummary = useMemo(() => {
    const total = monthlyExpenses.reduce((sum, month) => sum + month.total, 0)
    const monthlyAverage = monthlyExpenses.length === 0 ? 0 : Math.round(total / monthlyExpenses.length)
    const peakMonth = [...monthlyExpenses].sort((a, b) => b.total - a.total)[0]
    return { total, monthlyAverage, peakMonth, currentMonth: monthlyExpenses[0], biggestCategory: monthlyExpenses[0]?.categories[0] }
  }, [monthlyExpenses])

  const portfolioSummary = useMemo(() => {
    const totalAssets = assets.reduce((sum, entry) => sum + entry.amount, 0)
    const totalLiabilities = liabilities.reduce((sum, entry) => sum + entry.amount, 0)
    const liquidAssets = assets.filter((entry) => ['cash', 'deposit'].includes(entry.category)).reduce((sum, entry) => sum + entry.amount, 0)
    const riskyAssets = assets.filter((entry) => ['stock', 'crypto'].includes(entry.category)).reduce((sum, entry) => sum + entry.amount, 0)
    return { totalAssets, totalLiabilities, liquidAssets, netWorth: totalAssets - totalLiabilities, riskyRatio: totalAssets === 0 ? 0 : Math.round((riskyAssets / totalAssets) * 100) }
  }, [assets, liabilities])

  const allocation = useMemo(() => {
    const totalAssets = assets.reduce((sum, entry) => sum + entry.amount, 0)
    return Object.entries(CATEGORY_LABELS).map(([category, label]) => {
      const amount = assets.filter((entry) => entry.category === category).reduce((sum, entry) => sum + entry.amount, 0)
      return { category: category as AssetCategory, label, amount, share: totalAssets === 0 ? 0 : Math.round((amount / totalAssets) * 100) }
    }).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount)
  }, [assets])

  function handleDraftChange<K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.name.trim() || draft.amount <= 0) return
    setEntries((current) => [{ ...draft, id: crypto.randomUUID(), name: draft.name.trim(), note: draft.note.trim(), updatedAt: new Date().toISOString() }, ...current])
    setDraft({ ...INITIAL_DRAFT, category: draft.type === 'liability' ? 'loan' : 'cash' })
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as PortfolioEntry[]
        if (!Array.isArray(parsed)) throw new Error('Invalid backup file')
        setEntries(parsed)
      } catch {
        window.alert('JSON 백업 파일 형식을 확인해주세요.')
      } finally {
        event.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  function handleExpenseImport(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    Promise.all(files.map((file) => file.arrayBuffer().then((buffer) => parseWorkbookRows(XLSX.read(buffer, { type: 'array', cellDates: true, password: '850702' }), file.name))))
      .then((groups) => {
        const imported = groups.flat().map(normalizeExpense)
        if (imported.length === 0) {
          window.alert('가져올 생활비 내역을 찾지 못했습니다. 카드/통장 엑셀의 헤더 행을 확인해주세요.')
          return
        }
        const cardCount = imported.filter((transaction) => transaction.source === 'card').length
        const bankCount = imported.filter((transaction) => transaction.source === 'bank').length
        const settlementCount = imported.filter((transaction) => transaction.source === 'settlement').length
        window.alert(`생활비 파일 반영 완료\n신한카드 ${cardCount}건 · 통장 직접출금 ${bankCount}건 · 신한카드 결제대금 ${settlementCount}건\n제외 규칙: 세이프박스, 내 계좌 고정비 이체(관리비/구독료/통신비/보험)`) 
        setExpenses(imported)
        setSelectedMonth('')
        setSelectedCategory('전체')
        setViewMode('expenses')
      })
      .catch((error: Error) => {
        const passwordHint = error.message.includes('password') ? '\n카카오뱅크 엑셀 암호는 850702로 고정 반영해두었습니다. 브라우저에서 계속 실패하면 카카오뱅크 파일을 한 번 열어서 암호 없는 .xlsx로 다시 저장한 뒤 업로드해주세요.' : ''
        window.alert(`엑셀 파일을 읽지 못했습니다.${passwordHint}`)
      })
      .finally(() => { event.target.value = '' })
  }

  const categoryOptions = draft.type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES
  const topCategory = activeMonthlyExpense?.categories[0]
  const selectedCategoryTotal = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)

  return (
    <main className="app-shell">
      <nav className="top-nav">
        <div className="brand-lockup"><span className="brand-mark">V</span><span>vakde ledger</span></div>
        <div className="nav-actions">
          <button type="button" className={viewMode === 'overview' ? 'active' : ''} onClick={() => setViewMode('overview')}>자산 보드</button>
          <button type="button" className={viewMode === 'expenses' ? 'active' : ''} onClick={() => setViewMode('expenses')}>생활비 분석</button>
        </div>
      </nav>

      <section className="hero-redesign">
        <div className="hero-panel hero-copy-block">
          <p className="eyebrow">PRIVATE FINANCE ROOM</p>
          <h1>숫자를 쌓아두지 말고, 생활의 흐름으로 읽기.</h1>
          <p>자산, 부채, 카드 사용, 통장 직접출금을 한 화면에서 연결합니다. 생활비는 월별 총계가 아니라 카테고리·가맹점·전월 대비 변화까지 보고서처럼 해석합니다.</p>
          <div className="hero-actions">
            <button type="button" className="button-primary" onClick={() => setViewMode('expenses')}>생활비 리포트 보기</button>
            <button type="button" className="button-secondary" onClick={() => expenseInputRef.current?.click()}>엑셀 업로드</button>
            <input ref={expenseInputRef} type="file" accept=".xls,.xlsx" multiple hidden onChange={handleExpenseImport} />
          </div>
        </div>
        <div className="hero-panel hero-number-card">
          <span>이번 달 생활비</span>
          <strong>{formatCurrency(activeMonthlyExpense?.total ?? 0)}</strong>
          <p>{activeMonth || '데이터 없음'} · 일평균 {formatCurrency(activeMonthlyExpense?.dailyAverage ?? 0)}</p>
          <TrendChart months={monthlyExpenses} activeMonth={activeMonth} onSelect={(month) => { setSelectedMonth(month); setViewMode('expenses') }} />
        </div>
      </section>

      {viewMode === 'expenses' ? (
        <>
          <section className="expense-command-grid">
            <article className="glass-card month-command">
              <div className="section-heading compact"><p className="eyebrow">MONTHLY ANALYSIS</p><h2>월별 상세 분석</h2></div>
              <div className="month-picker">
                {monthlyExpenses.map((month) => (
                  <button type="button" key={month.month} className={month.month === activeMonth ? 'selected' : ''} onClick={() => { setSelectedMonth(month.month); setSelectedCategory('전체') }}>
                    <span>{month.month}</span>
                    <strong>{formatCompact(month.total)}원</strong>
                    <small>{month.count}건 · 일평균 {formatCompact(month.dailyAverage)}원</small>
                  </button>
                ))}
              </div>
            </article>

            <article className="glass-card report-headline">
              <p className="eyebrow">REPORT</p>
              <h2>{activeMonth} 생활비는 {formatCurrency(activeMonthlyExpense?.total ?? 0)}</h2>
              <p>{topCategory ? `${topCategory.category}가 ${formatCurrency(topCategory.amount)}로 전체의 ${topCategory.share}%를 차지합니다.` : '분석할 생활비 데이터가 없습니다.'} {previousMonthlyExpense ? `전월 대비 ${monthDelta >= 0 ? '증가' : '감소'}액은 ${formatCurrency(Math.abs(monthDelta))} (${Math.abs(monthDeltaRate)}%)입니다.` : '전월 비교 데이터는 다음 달이 쌓이면 표시됩니다.'}</p>
              <div className="headline-metrics">
                <span><small>카드 사용</small><strong>{formatCurrency(activeMonthlyExpense?.cardTotal ?? 0)}</strong></span>
                <span><small>통장 직접출금</small><strong>{formatCurrency(activeMonthlyExpense?.bankTotal ?? 0)}</strong></span>
                <span><small>신한카드 결제대금</small><strong>{formatCurrency(activeMonthlyExpense?.settlementTotal ?? 0)}</strong></span>
                <span><small>생활비 거래 수</small><strong>{activeMonthlyExpense?.count ?? 0}건</strong></span>
              </div>
            </article>
          </section>

          <section className="analytics-grid">
            <article className="glass-card donut-card">
              <div className="section-heading compact"><p className="eyebrow">CATEGORY MIX</p><h2>카테고리별 지출 비중</h2></div>
              <div className="donut-layout">
                <DonutChart slices={activeMonthlyExpense?.categories ?? []} />
                <div className="category-list">
                  {activeMonthlyExpense?.categories.map((category) => (
                    <button type="button" className={selectedCategory === category.category ? 'active' : ''} key={category.category} onClick={() => setSelectedCategory(category.category)}>
                      <i style={{ background: category.color }} />
                      <span>{category.category}<small>{category.count}건 · {category.share}%</small></span>
                      <strong>{formatCurrency(category.amount)}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </article>

            <article className="glass-card insight-card">
              <div className="section-heading compact"><p className="eyebrow">INSIGHTS</p><h2>이번 달 읽을 점</h2></div>
              <ul className="insight-list">
                <li><b>집중 카테고리</b><span>{topCategory ? `${topCategory.category} ${topCategory.share}%` : '없음'}</span></li>
                <li><b>전월 대비</b><span>{previousMonthlyExpense ? `${monthDelta >= 0 ? '+' : '-'}${formatCurrency(Math.abs(monthDelta))}` : '비교 대기'}</span></li>
                <li><b>반복 결제 후보</b><span>{activeMonthlyExpense?.merchants.find((merchant) => merchant.count > 1)?.name ?? '반복 가맹점 없음'}</span></li>
                <li><b>생활비 피크</b><span>{expenseSummary.peakMonth ? `${expenseSummary.peakMonth.month} ${formatCurrency(expenseSummary.peakMonth.total)}` : '없음'}</span></li>
              </ul>
            </article>

            <article className="glass-card merchant-card">
              <div className="section-heading compact"><p className="eyebrow">MERCHANTS</p><h2>상위 사용처</h2></div>
              <div className="merchant-list">
                {activeMonthlyExpense?.merchants.map((merchant, index) => (
                  <div key={merchant.name}><span>{index + 1}</span><strong>{merchant.name}</strong><small>{merchant.count}건</small><b>{formatCurrency(merchant.amount)}</b></div>
                ))}
              </div>
            </article>

            <article className="glass-card daily-card">
              <div className="section-heading compact"><p className="eyebrow">DAILY FLOW</p><h2>일별 지출 흐름</h2></div>
              <DailyFlowChart month={activeMonthlyExpense} />
            </article>
          </section>

          <section className="glass-card transaction-ledger">
            <div className="section-heading"><div><p className="eyebrow">LEDGER</p><h2>{selectedCategory === '전체' ? '전체 거래' : selectedCategory} 상세 내역</h2></div><p>{filteredTransactions.length}건 · {formatCurrency(selectedCategoryTotal)}</p></div>
            <div className="filter-row">
              <button type="button" className={selectedCategory === '전체' ? 'active' : ''} onClick={() => setSelectedCategory('전체')}>전체</button>
              {activeMonthlyExpense?.categories.map((category) => <button type="button" key={category.category} className={selectedCategory === category.category ? 'active' : ''} onClick={() => setSelectedCategory(category.category)}>{category.category}</button>)}
            </div>
            {(activeMonthlyExpense?.settlements.length ?? 0) > 0 && (
              <div className="settlement-note">
                <strong>통장 신한카드 결제대금 {formatCurrency(activeMonthlyExpense?.settlementTotal ?? 0)}</strong>
                <span>카드명세와 중복되는 출금이라 생활비 총액에는 다시 더하지 않고, 통장 정산 확인용으로만 표시합니다.</span>
              </div>
            )}
            <div className="transaction-list">
              {filteredTransactions.map((transaction) => (
                <article key={transaction.id}>
                  <time>{formatDate(transaction.date)}</time>
                  <div><strong>{transaction.description}</strong><small>{transaction.source === 'card' ? '카드명세' : '통장출금'} · {transaction.category}</small></div>
                  <b>{formatCurrency(transaction.amount)}</b>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="kpi-grid">
            <article><span>순자산</span><strong>{formatCurrency(portfolioSummary.netWorth)}</strong><small>총자산 - 총부채</small></article>
            <article><span>유동자산</span><strong>{formatCurrency(portfolioSummary.liquidAssets)}</strong><small>현금 + 예적금</small></article>
            <article><span>월평균 생활비</span><strong>{formatCurrency(expenseSummary.monthlyAverage)}</strong><small>{monthlyExpenses.length}개월 평균</small></article>
            <article><span>최대 지출월</span><strong>{expenseSummary.peakMonth?.month ?? '-'}</strong><small>{expenseSummary.peakMonth ? formatCurrency(expenseSummary.peakMonth.total) : '데이터 없음'}</small></article>
          </section>

          <section className="overview-grid">
            <article className="glass-card portfolio-panel">
              <div className="section-heading"><div><p className="eyebrow">PORTFOLIO</p><h2>자산 구성</h2></div><p>위험자산 {portfolioSummary.riskyRatio}%</p></div>
              <div className="allocation-list">
                {allocation.map((item) => <div key={item.category}><span>{item.label}</span><div><i style={{ width: `${item.share}%`, background: CATEGORY_COLORS[item.category] }} /></div><strong>{formatCurrency(item.amount)}</strong><small>{item.share}%</small></div>)}
              </div>
            </article>

            <article className="glass-card composer-panel">
              <div className="section-heading compact"><p className="eyebrow">INPUT</p><h2>자산/부채 추가</h2></div>
              <form className="entry-form" onSubmit={handleSubmit}>
                <label>구분<select value={draft.type} onChange={(event) => { const nextType = event.target.value as EntryType; handleDraftChange('type', nextType); handleDraftChange('category', nextType === 'asset' ? 'cash' : 'loan') }}><option value="asset">자산</option><option value="liability">부채</option></select></label>
                <label>카테고리<select value={draft.category} onChange={(event) => handleDraftChange('category', event.target.value as AssetCategory)}>{categoryOptions.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>
                <label>이름<input value={draft.name} onChange={(event) => handleDraftChange('name', event.target.value)} placeholder="예: 생활비 통장" /></label>
                <label>금액<input type="number" min="0" value={draft.amount || ''} onChange={(event) => handleDraftChange('amount', Number(event.target.value))} placeholder="원 단위" /></label>
                <label className="full">메모<textarea rows={3} value={draft.note} onChange={(event) => handleDraftChange('note', event.target.value)} placeholder="목적, 만기, 상환조건 등" /></label>
                <div className="form-actions"><button className="button-primary" type="submit">항목 추가</button><button className="button-secondary" type="button" onClick={handleExport}>백업</button><button className="button-secondary" type="button" onClick={() => backupInputRef.current?.click()}>불러오기</button><input ref={backupInputRef} type="file" accept="application/json" hidden onChange={handleImport} /></div>
              </form>
            </article>
          </section>

          <section className="asset-board">
            {[...assets, ...liabilities].map((entry) => <article className={`asset-card ${entry.type}`} key={entry.id}><span>{entry.type === 'asset' ? 'ASSET' : 'DEBT'} · {CATEGORY_LABELS[entry.category]}</span><h3>{entry.name}</h3><strong>{entry.type === 'asset' ? '+' : '-'}{formatCurrency(entry.amount)}</strong><p>{entry.note || '메모 없음'}</p><button type="button" onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}>삭제</button></article>)}
          </section>
        </>
      )}
    </main>
  )
}

export default App
