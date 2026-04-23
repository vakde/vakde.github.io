import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import * as XLSX from 'xlsx'
import './App.css'
import { INITIAL_LIVING_EXPENSES } from './initialLivingExpenses'
import type { LivingExpenseTransaction } from './livingExpenseTypes'

type EntryType = 'asset' | 'liability'
type AssetCategory = 'cash' | 'deposit' | 'stock' | 'crypto' | 'real-estate' | 'retirement' | 'loan' | 'card'
type ViewMode = 'wealth' | 'expenses'

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

const STORAGE_KEY = 'myfml-portfolio-v1'
const EXPENSE_STORAGE_KEY = 'myfml-living-expenses-v1'

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
  cash: '#0f766e',
  deposit: '#0f766e',
  stock: '#2563eb',
  crypto: '#8b5cf6',
  'real-estate': '#b45309',
  retirement: '#047857',
  loan: '#dc2626',
  card: '#f97316',
}

const INITIAL_DRAFT: EntryDraft = {
  type: 'asset',
  category: 'cash',
  name: '',
  amount: 0,
  note: '',
}

const SAMPLE_ENTRIES: PortfolioEntry[] = [
  {
    id: 'sample-asset-1',
    type: 'asset',
    category: 'cash',
    name: '생활비 통장',
    amount: 3200000,
    note: '매달 자동이체/생활비',
    updatedAt: '2026-04-22',
  },
  {
    id: 'sample-asset-2',
    type: 'asset',
    category: 'deposit',
    name: '비상금 적금',
    amount: 10000000,
    note: '6개월치 생활비 목표',
    updatedAt: '2026-04-22',
  },
  {
    id: 'sample-asset-3',
    type: 'asset',
    category: 'stock',
    name: '미국 ETF 계좌',
    amount: 18500000,
    note: '장기 투자',
    updatedAt: '2026-04-22',
  },
  {
    id: 'sample-debt-1',
    type: 'liability',
    category: 'loan',
    name: '전세대출',
    amount: 42000000,
    note: '고정금리',
    updatedAt: '2026-04-22',
  },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

function normalizeDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
    }
  }

  const text = String(value ?? '').trim()
  const match = text.match(/(\d{4})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/)

  if (!match) {
    return new Date().toISOString().slice(0, 10)
  }

  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
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
  if (/택시|SR|코레일|철도|버스|지하철|주유|파킹|교통/.test(description)) return '교통'
  if (/마트|슈퍼|FRESH|프레시|이마트|쿠팡|식품|정육|배달|롯데리아|카페|커피|스타벅스|맥도날드|파리바게뜨|뚜레쥬르|버거|식당|푸드|치킨|피자|족발|분식|한식|일식|중식|편의점|CU|씨유|GS25|세븐/.test(description)) return '식비/장보기'
  if (/병원|약국|의원|의료|헬스|건강/.test(description)) return '의료/건강'
  if (/네이버페이|온라인|쇼핑|몰|스토어|아마존|G마켓|11번가|무신사|이랜드/.test(description)) return '쇼핑'
  if (/관리비|전기|가스|수도|통신|모바일|SKT|KT|LG U|아파트|월세|임대료/.test(description)) return '주거/통신'
  if (/GAMSGO|구글|APPLE|넷플릭스|유튜브|멜론|구독|게임|문화|영화|서점/.test(description)) return '구독/문화'
  if (/학원|교육|도서|문구|학교|어린이|키즈/.test(description)) return '교육/육아'
  return '기타'
}

function isLikelyCardSettlement(description: string) {
  return /카드|신한|현대|삼성|국민|롯데|우리|하나|체크|결제대금|카드대금|자동납부/.test(description)
}

function parseWorkbookRows(workbook: XLSX.WorkBook, fileName: string) {
  const importedAt = Date.now()
  const parsed: LivingExpenseTransaction[] = []

  workbook.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      raw: false,
      defval: '',
    })

    rows.forEach((row, rowIndex) => {
      const cardDate = pickValue(row, ['거래일', '이용일'])
      const merchant = pickValue(row, ['가맹점명', '사용처', '이용가맹점'])
      const cardAmount = pickValue(row, ['금액', '이용금액', '승인금액'])
      const cancelStatus = String(pickValue(row, ['취소상태', '취소']) ?? '')

      if (merchant && cardAmount && !cancelStatus.includes('취소')) {
        const description = String(merchant).trim()
        parsed.push({
          id: `upload-${importedAt}-${sheetName}-${rowIndex}`,
          date: normalizeDate(cardDate),
          source: 'card',
          description,
          amount: numberFromCell(cardAmount),
          category: categorizeExpense(description),
          memo: `${fileName} · 카드내역`,
        })
        return
      }

      const bankDate = pickValue(row, ['거래일시', '거래일', '일자'])
      const bankDescription = pickValue(row, ['내용', '적요', '거래내용', '받는분', '보낸분'])
      const withdrawal = pickValue(row, ['출금', '지급', '찾으신금액'])
      const deposit = pickValue(row, ['입금', '맡기신금액'])
      const genericAmount = pickValue(row, ['거래금액', '금액'])
      const description = String(bankDescription ?? '').trim()
      const withdrawalAmount = numberFromCell(withdrawal ?? genericAmount)
      const depositAmount = numberFromCell(deposit)

      if (bankDate && description && withdrawalAmount > 0 && depositAmount === 0 && !isLikelyCardSettlement(description)) {
        parsed.push({
          id: `upload-${importedAt}-${sheetName}-${rowIndex}`,
          date: normalizeDate(bankDate),
          source: 'bank',
          description,
          amount: withdrawalAmount,
          category: categorizeExpense(description),
          memo: `${fileName} · 통장출금`,
        })
      }
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
  if (!raw) return INITIAL_LIVING_EXPENSES

  try {
    const parsed = JSON.parse(raw) as LivingExpenseTransaction[]
    return Array.isArray(parsed) ? parsed : INITIAL_LIVING_EXPENSES
  } catch {
    return INITIAL_LIVING_EXPENSES
  }
}

function groupMonthlyExpenses(expenses: LivingExpenseTransaction[]) {
  const map = new Map<string, LivingExpenseTransaction[]>()

  expenses.forEach((expense) => {
    const month = expense.date.slice(0, 7)
    map.set(month, [...(map.get(month) ?? []), expense])
  })

  return [...map.entries()]
    .map(([month, transactions]) => {
      const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
      const categories = [...transactions.reduce((categoryMap, transaction) => {
        categoryMap.set(transaction.category, (categoryMap.get(transaction.category) ?? 0) + transaction.amount)
        return categoryMap
      }, new Map<string, number>()).entries()]
        .map(([category, amount]) => ({
          category,
          amount,
          share: total === 0 ? 0 : Math.round((amount / total) * 100),
        }))
        .sort((a, b) => b.amount - a.amount)

      return {
        month,
        total,
        cardTotal: transactions.filter((transaction) => transaction.source === 'card').reduce((sum, transaction) => sum + transaction.amount, 0),
        bankTotal: transactions.filter((transaction) => transaction.source === 'bank').reduce((sum, transaction) => sum + transaction.amount, 0),
        count: transactions.length,
        categories,
        transactions: [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
      }
    })
    .sort((a, b) => b.month.localeCompare(a.month))
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('wealth')
  const [entries, setEntries] = useState<PortfolioEntry[]>(() =>
    typeof window === 'undefined' ? SAMPLE_ENTRIES : readEntries(),
  )
  const [expenses, setExpenses] = useState<LivingExpenseTransaction[]>(() =>
    typeof window === 'undefined' ? INITIAL_LIVING_EXPENSES : readExpenses(),
  )
  const [selectedMonth, setSelectedMonth] = useState('')
  const [draft, setDraft] = useState<EntryDraft>(INITIAL_DRAFT)
  const backupInputRef = useRef<HTMLInputElement | null>(null)
  const expenseInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  useEffect(() => {
    localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses))
  }, [expenses])

  const assets = useMemo(() => entries.filter((entry) => entry.type === 'asset').sort((a, b) => b.amount - a.amount), [entries])
  const liabilities = useMemo(() => entries.filter((entry) => entry.type === 'liability').sort((a, b) => b.amount - a.amount), [entries])
  const monthlyExpenses = useMemo(() => groupMonthlyExpenses(expenses), [expenses])
  const activeMonth = selectedMonth || monthlyExpenses[0]?.month || ''
  const activeMonthlyExpense = monthlyExpenses.find((month) => month.month === activeMonth)

  const expenseSummary = useMemo(() => {
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const currentMonth = monthlyExpenses[0]
    const biggestCategory = currentMonth?.categories[0]
    return { total, currentMonth, biggestCategory }
  }, [expenses, monthlyExpenses])

  const summary = useMemo(() => {
    const totalAssets = assets.reduce((sum, entry) => sum + entry.amount, 0)
    const totalLiabilities = liabilities.reduce((sum, entry) => sum + entry.amount, 0)
    const netWorth = totalAssets - totalLiabilities
    const liquidAssets = assets.filter((entry) => ['cash', 'deposit'].includes(entry.category)).reduce((sum, entry) => sum + entry.amount, 0)
    const riskyAssets = assets.filter((entry) => ['stock', 'crypto'].includes(entry.category)).reduce((sum, entry) => sum + entry.amount, 0)

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      liquidAssets,
      leverageRatio: totalAssets === 0 ? 0 : Math.round((totalLiabilities / totalAssets) * 100),
      riskyRatio: totalAssets === 0 ? 0 : Math.round((riskyAssets / totalAssets) * 100),
    }
  }, [assets, liabilities])

  const grouped = useMemo(() => {
    const totalAssets = assets.reduce((sum, entry) => sum + entry.amount, 0)
    return Object.entries(CATEGORY_LABELS)
      .map(([category, label]) => {
        const categoryAmount = assets.filter((entry) => entry.category === category).reduce((sum, entry) => sum + entry.amount, 0)
        return { category: category as AssetCategory, label, amount: categoryAmount, share: totalAssets === 0 ? 0 : Math.round((categoryAmount / totalAssets) * 100) }
      })
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
  }, [assets])

  const recentEntries = useMemo(() => [...entries].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6), [entries])

  function handleDraftChange<K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.name.trim() || draft.amount <= 0) return

    const entry: PortfolioEntry = {
      ...draft,
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      note: draft.note.trim(),
      updatedAt: new Date().toISOString(),
    }

    setEntries((current) => [entry, ...current])
    setDraft({ ...INITIAL_DRAFT, category: draft.type === 'liability' ? 'loan' : 'cash' })
  }

  function handleDelete(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id))
  }

  function handleReset() {
    if (window.confirm('현재 기록을 샘플 데이터로 덮어쓸까요?')) setEntries(SAMPLE_ENTRIES)
  }

  function handleExpenseReset() {
    if (window.confirm('생활비 내역을 다운로드 폴더 신한카드 샘플 데이터로 되돌릴까요?')) {
      setExpenses(INITIAL_LIVING_EXPENSES)
      setSelectedMonth('')
    }
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

    Promise.all(
      files.map((file) =>
        file.arrayBuffer().then((buffer) => {
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
          return parseWorkbookRows(workbook, file.name)
        }),
      ),
    )
      .then((groups) => {
        const imported = groups.flat()
        if (imported.length === 0) {
          window.alert('가져올 생활비 내역을 찾지 못했습니다. 카드/통장 엑셀의 헤더 행을 확인해주세요.')
          return
        }
        setExpenses(imported)
        setSelectedMonth('')
        setViewMode('expenses')
      })
      .catch((error: Error) => {
        const passwordHint = error.message.includes('password') ? '\n암호가 걸린 엑셀은 암호를 해제해서 다시 저장한 뒤 업로드해주세요.' : ''
        window.alert(`엑셀 파일을 읽지 못했습니다.${passwordHint}`)
      })
      .finally(() => {
        event.target.value = ''
      })
  }

  const topAllocation = grouped[0]
  const categoryOptions = draft.type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES
  const latestUpdatedAt = recentEntries[0]?.updatedAt
  const netWorthTone = summary.netWorth >= 0 ? 'positive' : 'negative'

  function renderEntryCard(entry: PortfolioEntry) {
    return (
      <article className={`entry-card ${entry.type}`} key={entry.id}>
        <div className="entry-card-top">
          <div>
            <span className={`badge ${entry.type}`}>{entry.type === 'asset' ? 'ASSET' : 'DEBT'}</span>
            <h3>{entry.name}</h3>
          </div>
          <button type="button" className="text-button" onClick={() => handleDelete(entry.id)}>삭제</button>
        </div>
        <strong className="entry-card-amount">{entry.type === 'asset' ? '+' : '-'}{formatCurrency(entry.amount)}</strong>
        <p className="entry-card-note">{entry.note || '메모 없음'}</p>
        <div className="entry-card-meta">
          <span>{CATEGORY_LABELS[entry.category]}</span>
          <span>{formatDate(entry.updatedAt)}</span>
        </div>
      </article>
    )
  }

  function renderExpenseScreen() {
    return (
      <>
        <section className="expense-toolbar panel">
          <div>
            <p className="panel-kicker">Living expenses</p>
            <h2>월별 생활비 사용현황</h2>
            <p className="panel-hint wide">카드 사용건은 생활비 통장의 카드대금 출금으로 최종 빠져나간다고 보고, 카드 상세내역과 통장 직접출금을 합산합니다. 통장 엑셀의 카드대금 출금은 중복 방지를 위해 제외합니다.</p>
          </div>
          <div className="toolbar-actions">
            <button type="button" className="button-primary" onClick={() => expenseInputRef.current?.click()}>엑셀 업로드</button>
            <button type="button" className="button-secondary" onClick={handleExpenseReset}>샘플 복원</button>
            <button type="button" className="button-secondary" onClick={() => setViewMode('wealth')}>자산 화면</button>
            <input ref={expenseInputRef} type="file" accept=".xls,.xlsx" multiple hidden onChange={handleExpenseImport} />
          </div>
        </section>

        <section className="metric-grid">
          <article className="metric-card emphasis positive">
            <span className="metric-label">최근월 생활비</span>
            <strong>{formatCurrency(expenseSummary.currentMonth?.total ?? 0)}</strong>
            <p>{expenseSummary.currentMonth?.month ?? '데이터 없음'} 기준</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">전체 생활비</span>
            <strong>{formatCurrency(expenseSummary.total)}</strong>
            <p>{expenses.length}건 누적</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">카드 사용</span>
            <strong>{formatCurrency(expenses.filter((expense) => expense.source === 'card').reduce((sum, expense) => sum + expense.amount, 0))}</strong>
            <p>카드 명세서 기준</p>
          </article>
          <article className="metric-card risk">
            <span className="metric-label">최대 지출</span>
            <strong>{expenseSummary.biggestCategory?.category ?? '미계산'}</strong>
            <p>{expenseSummary.biggestCategory ? formatCurrency(expenseSummary.biggestCategory.amount) : '엑셀 업로드 후 계산'}</p>
          </article>
        </section>

        <section className="expense-grid">
          <article className="panel month-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Months</p>
                <h2>월 선택</h2>
              </div>
            </div>
            <div className="month-list">
              {monthlyExpenses.map((month) => (
                <button type="button" className={`month-button ${month.month === activeMonth ? 'active' : ''}`} key={month.month} onClick={() => setSelectedMonth(month.month)}>
                  <span>{month.month}</span>
                  <strong>{formatCurrency(month.total)}</strong>
                  <small>카드 {formatCurrency(month.cardTotal)} · 통장 {formatCurrency(month.bankTotal)}</small>
                </button>
              ))}
            </div>
          </article>

          <article className="panel expense-detail-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Breakdown</p>
                <h2>{activeMonth} 상세</h2>
              </div>
              <p className="panel-hint">{activeMonthlyExpense?.count ?? 0}건 · {formatCurrency(activeMonthlyExpense?.total ?? 0)}</p>
            </div>
            <div className="expense-categories">
              {activeMonthlyExpense?.categories.map((category) => (
                <div className="allocation-row" key={category.category}>
                  <div className="allocation-meta">
                    <span>{category.category}</span>
                    <strong>{formatCurrency(category.amount)}</strong>
                  </div>
                  <div className="allocation-bar"><span style={{ width: `${category.share}%` }} /></div>
                  <small>{category.share}%</small>
                </div>
              ))}
            </div>
            <div className="transaction-table">
              {(activeMonthlyExpense?.transactions ?? []).map((transaction) => (
                <article className="transaction-row" key={transaction.id}>
                  <div>
                    <strong>{transaction.description}</strong>
                    <small>{transaction.date} · {transaction.source === 'card' ? '카드' : '통장'} · {transaction.category}</small>
                  </div>
                  <span>{formatCurrency(transaction.amount)}</span>
                </article>
              ))}
            </div>
          </article>
        </section>
      </>
    )
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">QUIET LEDGER</p>
          <h1><span>내 자산을 차분하게 읽는</span><span>개인 웰스 데스크</span></h1>
          <p className="hero-text">자산과 부채를 한눈에 정리하고, 생활비 항목에서는 카드/통장 엑셀을 월별 사용현황으로 확인합니다.</p>
          <div className="hero-actions">
            <button type="button" className="button-primary" onClick={() => setViewMode('expenses')}>생활비 항목</button>
            <button type="button" className="button-secondary" onClick={handleExport}>백업 내보내기</button>
            <button type="button" className="button-secondary" onClick={() => backupInputRef.current?.click()}>백업 불러오기</button>
            <button type="button" className="button-secondary danger" onClick={handleReset}>샘플 데이터 복원</button>
            <input ref={backupInputRef} type="file" accept="application/json" hidden onChange={handleImport} />
          </div>
        </div>
        <aside className="hero-rail">
          <article className={`signal-card ${netWorthTone}`}>
            <span className="signal-label">현재 순자산</span>
            <strong>{formatCurrency(summary.netWorth)}</strong>
            <p>{latestUpdatedAt ? `${formatDate(latestUpdatedAt)} 기준으로 최근 기록이 반영돼 있습니다.` : '첫 항목을 추가하면 자산 상태가 이곳에 요약됩니다.'}</p>
          </article>
          <div className="mini-grid">
            <article className="mini-card"><span>최근 생활비</span><strong>{formatCurrency(expenseSummary.currentMonth?.total ?? 0)}</strong><small>{expenseSummary.currentMonth?.month ?? '업로드 대기'}</small></article>
            <article className="mini-card"><span>입력 항목</span><strong>{entries.length}개</strong><small>자산 {assets.length}개 · 부채 {liabilities.length}개</small></article>
            <article className="mini-card"><span>위험자산</span><strong>{summary.riskyRatio}%</strong><small>주식/가상자산 비중</small></article>
          </div>
        </aside>
      </section>

      {viewMode === 'expenses' ? renderExpenseScreen() : (
        <>
          <section className="metric-grid">
            <article className="metric-card"><span className="metric-label">총자산</span><strong>{formatCurrency(summary.totalAssets)}</strong><p>현금, 예적금, 투자자산 포함</p></article>
            <article className={`metric-card emphasis ${netWorthTone}`}><span className="metric-label">순자산</span><strong>{formatCurrency(summary.netWorth)}</strong><p>총자산에서 총부채를 차감한 값</p></article>
            <article className="metric-card"><span className="metric-label">유동자산</span><strong>{formatCurrency(summary.liquidAssets)}</strong><p>현금 + 예적금 기준</p></article>
            <article className="metric-card risk"><span className="metric-label">레버리지</span><strong>{summary.leverageRatio}%</strong><p>총부채 / 총자산</p></article>
          </section>

          <section className="workspace-grid">
            <article className="panel composer-panel">
              <div className="panel-header"><div><p className="panel-kicker">Compose</p><h2>자산과 부채를 입력하는 작업 영역</h2></div><p className="panel-hint">이름, 카테고리, 메모를 같이 남겨서 나중에 봐도 맥락이 남도록 구성합니다.</p></div>
              <div className="composer-layout">
                <form className="entry-form" onSubmit={handleSubmit}>
                  <label>구분<select value={draft.type} onChange={(event) => { const nextType = event.target.value as EntryType; handleDraftChange('type', nextType); handleDraftChange('category', nextType === 'asset' ? 'cash' : 'loan') }}><option value="asset">자산</option><option value="liability">부채</option></select></label>
                  <label>카테고리<select value={draft.category} onChange={(event) => handleDraftChange('category', event.target.value as AssetCategory)}>{categoryOptions.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>
                  <label>이름<input value={draft.name} onChange={(event) => handleDraftChange('name', event.target.value)} placeholder="예: ISA 계좌, 생활비 통장" /></label>
                  <label>금액<input type="number" min="0" step="10000" value={draft.amount || ''} onChange={(event) => handleDraftChange('amount', Number(event.target.value))} placeholder="원 단위 숫자" /></label>
                  <label className="full">메모<textarea rows={5} value={draft.note} onChange={(event) => handleDraftChange('note', event.target.value)} placeholder="만기, 투자전략, 상환조건, 계좌 목적 등을 적어두세요." /></label>
                  <button className="button-primary submit-button" type="submit">항목 추가</button>
                </form>
                <aside className={`draft-preview ${draft.type}`}><span className="draft-label">Live Preview</span><h3>{draft.name.trim() || '새 항목 미리보기'}</h3><p className="draft-meta">{draft.type === 'asset' ? '자산' : '부채'} · {CATEGORY_LABELS[draft.category]}</p><strong>{draft.amount > 0 ? formatCurrency(draft.amount) : '금액 미입력'}</strong><p className="draft-note">{draft.note.trim() ? draft.note : '메모를 적어두면 나중에 만기, 목적, 상환조건을 더 빨리 파악할 수 있습니다.'}</p></aside>
              </div>
            </article>

            <article className="panel allocation-panel">
              <div className="panel-header"><div><p className="panel-kicker">Allocation</p><h2>자산 구성과 집중도</h2></div><p className="panel-hint">자산 항목만 기준으로 어디에 비중이 몰려 있는지 빠르게 확인합니다.</p></div>
              <div className="allocation-hero"><div><span className="allocation-kicker">집중도</span><strong>{topAllocation ? `${topAllocation.share}%` : '0%'}</strong><p>{topAllocation ? `${topAllocation.label} 비중이 가장 큽니다.` : '자산 입력 후 계산됩니다.'}</p></div><div className="allocation-side-note"><span>총부채</span><strong>{formatCurrency(summary.totalLiabilities)}</strong></div></div>
              <div className="allocation-list">{grouped.length > 0 ? grouped.map((item) => <div className="allocation-row" key={item.category}><div className="allocation-meta"><span>{item.label}</span><strong>{formatCurrency(item.amount)}</strong></div><div className="allocation-bar"><span style={{ width: `${item.share}%`, background: CATEGORY_COLORS[item.category] }} /></div><small>{item.share}%</small></div>) : <p className="empty-state">아직 자산 항목이 없습니다. 첫 항목을 추가해보세요.</p>}</div>
            </article>
          </section>

          <section className="board-grid">
            <article className="panel ledger-panel"><div className="panel-header"><div><p className="panel-kicker">Assets</p><h2>보유 자산</h2></div><p className="panel-hint">{assets.length}개 항목 · 금액 큰 순서</p></div><div className="entry-list">{assets.length > 0 ? assets.map(renderEntryCard) : <p className="empty-state">아직 입력된 자산이 없습니다.</p>}</div></article>
            <article className="panel ledger-panel liability-panel"><div className="panel-header"><div><p className="panel-kicker">Liabilities</p><h2>부채와 미지급 항목</h2></div><p className="panel-hint">{liabilities.length}개 항목 · 금액 큰 순서</p></div><div className="entry-list">{liabilities.length > 0 ? liabilities.map(renderEntryCard) : <p className="empty-state">아직 입력된 부채가 없습니다.</p>}</div></article>
            <article className="panel activity-panel"><div className="panel-header"><div><p className="panel-kicker">Recent</p><h2>최근 업데이트</h2></div><p className="panel-hint">가장 최근에 수정된 항목 6개</p></div><div className="activity-list">{recentEntries.length > 0 ? recentEntries.map((entry) => <article className="activity-card" key={entry.id}><div className="activity-line" /><div className="activity-body"><div className="activity-top"><span className={`badge ${entry.type}`}>{entry.type === 'asset' ? 'ASSET' : 'DEBT'}</span><span className="activity-date">{formatDate(entry.updatedAt)}</span></div><strong>{entry.name}</strong><p>{CATEGORY_LABELS[entry.category]} · {formatCurrency(entry.amount)}</p></div></article>) : <p className="empty-state">아직 기록이 없어 최근 업데이트를 표시할 수 없습니다.</p>}</div></article>
          </section>
        </>
      )}
    </main>
  )
}

export default App
