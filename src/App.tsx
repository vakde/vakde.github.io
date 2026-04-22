import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'

type EntryType = 'asset' | 'liability'

type AssetCategory =
  | 'cash'
  | 'deposit'
  | 'stock'
  | 'crypto'
  | 'real-estate'
  | 'retirement'
  | 'loan'
  | 'card'

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
    id: crypto.randomUUID(),
    type: 'asset',
    category: 'cash',
    name: '생활비 통장',
    amount: 3200000,
    note: '매달 자동이체/생활비',
    updatedAt: '2026-04-22',
  },
  {
    id: crypto.randomUUID(),
    type: 'asset',
    category: 'deposit',
    name: '비상금 적금',
    amount: 10000000,
    note: '6개월치 생활비 목표',
    updatedAt: '2026-04-22',
  },
  {
    id: crypto.randomUUID(),
    type: 'asset',
    category: 'stock',
    name: '미국 ETF 계좌',
    amount: 18500000,
    note: '장기 투자',
    updatedAt: '2026-04-22',
  },
  {
    id: crypto.randomUUID(),
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

function readEntries() {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return SAMPLE_ENTRIES
  }

  try {
    const parsed = JSON.parse(raw) as PortfolioEntry[]

    if (!Array.isArray(parsed)) {
      return SAMPLE_ENTRIES
    }

    return parsed
  } catch {
    return SAMPLE_ENTRIES
  }
}

function App() {
  const [entries, setEntries] = useState<PortfolioEntry[]>(() =>
    typeof window === 'undefined' ? SAMPLE_ENTRIES : readEntries(),
  )
  const [draft, setDraft] = useState<EntryDraft>(INITIAL_DRAFT)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  const summary = useMemo(() => {
    const totalAssets = entries
      .filter((entry) => entry.type === 'asset')
      .reduce((sum, entry) => sum + entry.amount, 0)

    const totalLiabilities = entries
      .filter((entry) => entry.type === 'liability')
      .reduce((sum, entry) => sum + entry.amount, 0)

    const netWorth = totalAssets - totalLiabilities
    const riskyAssets = entries
      .filter((entry) => entry.type === 'asset' && ['stock', 'crypto'].includes(entry.category))
      .reduce((sum, entry) => sum + entry.amount, 0)

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      riskyRatio: totalAssets === 0 ? 0 : Math.round((riskyAssets / totalAssets) * 100),
    }
  }, [entries])

  const grouped = useMemo(() => {
    const assets = entries.filter((entry) => entry.type === 'asset')
    const totalAssets = assets.reduce((sum, entry) => sum + entry.amount, 0)

    return Object.entries(CATEGORY_LABELS)
      .map(([category, label]) => {
        const categoryAmount = assets
          .filter((entry) => entry.category === category)
          .reduce((sum, entry) => sum + entry.amount, 0)

        return {
          category: category as AssetCategory,
          label,
          amount: categoryAmount,
          share: totalAssets === 0 ? 0 : Math.round((categoryAmount / totalAssets) * 100),
        }
      })
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
  }, [entries])

  const recentEntries = useMemo(
    () =>
      [...entries]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6),
    [entries],
  )

  function handleDraftChange<K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!draft.name.trim() || draft.amount <= 0) {
      return
    }

    const entry: PortfolioEntry = {
      ...draft,
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      note: draft.note.trim(),
      updatedAt: new Date().toISOString(),
    }

    setEntries((current) => [entry, ...current])
    setDraft({
      ...INITIAL_DRAFT,
      category: draft.type === 'liability' ? 'loan' : 'cash',
    })
  }

  function handleDelete(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id))
  }

  function handleReset() {
    setEntries(SAMPLE_ENTRIES)
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as PortfolioEntry[]

        if (!Array.isArray(parsed)) {
          throw new Error('Invalid backup file')
        }

        setEntries(parsed)
      } catch {
        window.alert('JSON 백업 파일 형식을 확인해주세요.')
      } finally {
        event.target.value = ''
      }
    }

    reader.readAsText(file)
  }

  return (
    <main className="shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">MYFML FINANCE BOARD</p>
          <h1>내 자산을 한 화면에서 보고, 바로 수정하는 개인 포트폴리오 대시보드</h1>
          <p className="hero-text">
            GitHub Pages에서 바로 돌아가는 정적 사이트입니다. 데이터는 브라우저에 저장되고,
            JSON으로 백업/복원할 수 있습니다.
          </p>
        </div>

        <div className="hero-actions">
          <button type="button" className="ghost-button" onClick={handleExport}>
            백업 내보내기
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => fileInputRef.current?.click()}
          >
            백업 불러오기
          </button>
          <button type="button" className="ghost-button danger" onClick={handleReset}>
            샘플로 초기화
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={handleImport}
          />
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span>총자산</span>
          <strong>{formatCurrency(summary.totalAssets)}</strong>
        </article>
        <article className="stat-card">
          <span>총부채</span>
          <strong>{formatCurrency(summary.totalLiabilities)}</strong>
        </article>
        <article className="stat-card accent">
          <span>순자산</span>
          <strong>{formatCurrency(summary.netWorth)}</strong>
        </article>
        <article className="stat-card">
          <span>위험자산 비중</span>
          <strong>{summary.riskyRatio}%</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel form-panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Add entry</p>
              <h2>자산/부채 입력</h2>
            </div>
            <p className="panel-hint">예금, 주식, 대출, 카드값 등을 직접 입력하세요.</p>
          </div>

          <form className="entry-form" onSubmit={handleSubmit}>
            <label>
              구분
              <select
                value={draft.type}
                onChange={(event) => {
                  const nextType = event.target.value as EntryType
                  handleDraftChange('type', nextType)
                  handleDraftChange('category', nextType === 'asset' ? 'cash' : 'loan')
                }}
              >
                <option value="asset">자산</option>
                <option value="liability">부채</option>
              </select>
            </label>

            <label>
              카테고리
              <select
                value={draft.category}
                onChange={(event) =>
                  handleDraftChange('category', event.target.value as AssetCategory)
                }
              >
                {Object.entries(CATEGORY_LABELS)
                  .filter(([category]) =>
                    draft.type === 'asset'
                      ? !['loan', 'card'].includes(category)
                      : ['loan', 'card'].includes(category),
                  )
                  .map(([category, label]) => (
                    <option key={category} value={category}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              이름
              <input
                value={draft.name}
                onChange={(event) => handleDraftChange('name', event.target.value)}
                placeholder="예: ISA 계좌, 생활비 통장"
              />
            </label>

            <label>
              금액
              <input
                type="number"
                min="0"
                step="10000"
                value={draft.amount || ''}
                onChange={(event) => handleDraftChange('amount', Number(event.target.value))}
                placeholder="원 단위 숫자"
              />
            </label>

            <label className="full">
              메모
              <textarea
                rows={4}
                value={draft.note}
                onChange={(event) => handleDraftChange('note', event.target.value)}
                placeholder="만기, 투자전략, 상환조건 등을 적어두세요."
              />
            </label>

            <button className="primary-button" type="submit">
              항목 추가
            </button>
          </form>
        </article>

        <article className="panel breakdown-panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Allocation</p>
              <h2>자산 비중</h2>
            </div>
            <p className="panel-hint">자산 항목만 기준으로 카테고리별 분포를 계산합니다.</p>
          </div>

          <div className="allocation-list">
            {grouped.length > 0 ? (
              grouped.map((item) => (
                <div className="allocation-row" key={item.category}>
                  <div className="allocation-meta">
                    <span>{item.label}</span>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                  <div className="allocation-bar">
                    <span
                      style={{
                        width: `${item.share}%`,
                        background: CATEGORY_COLORS[item.category],
                      }}
                    />
                  </div>
                  <small>{item.share}%</small>
                </div>
              ))
            ) : (
              <p className="empty-state">아직 자산 항목이 없습니다. 첫 항목을 추가해보세요.</p>
            )}
          </div>
        </article>
      </section>

      <section className="panel ledger-panel">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">Ledger</p>
            <h2>최근 등록 항목</h2>
          </div>
          <p className="panel-hint">데이터는 이 브라우저에 저장됩니다.</p>
        </div>

        <div className="ledger-list">
          {recentEntries.map((entry) => (
            <article className="ledger-card" key={entry.id}>
              <div className="ledger-top">
                <div>
                  <span className={`tag ${entry.type}`}>{entry.type === 'asset' ? '자산' : '부채'}</span>
                  <h3>{entry.name}</h3>
                </div>
                <button type="button" className="text-button" onClick={() => handleDelete(entry.id)}>
                  삭제
                </button>
              </div>
              <p className="ledger-amount">{formatCurrency(entry.amount)}</p>
              <p className="ledger-note">{entry.note || '메모 없음'}</p>
              <div className="ledger-bottom">
                <span>{CATEGORY_LABELS[entry.category]}</span>
                <span>{formatDate(entry.updatedAt)}</span>
              </div>
            </article>
          ))}

          {recentEntries.length === 0 && (
            <p className="empty-state">표시할 항목이 없습니다.</p>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
