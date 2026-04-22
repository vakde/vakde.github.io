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

const ASSET_CATEGORIES: AssetCategory[] = [
  'cash',
  'deposit',
  'stock',
  'crypto',
  'real-estate',
  'retirement',
]

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

  const assets = useMemo(
    () =>
      entries
        .filter((entry) => entry.type === 'asset')
        .sort((a, b) => b.amount - a.amount),
    [entries],
  )

  const liabilities = useMemo(
    () =>
      entries
        .filter((entry) => entry.type === 'liability')
        .sort((a, b) => b.amount - a.amount),
    [entries],
  )

  const summary = useMemo(() => {
    const totalAssets = assets.reduce((sum, entry) => sum + entry.amount, 0)
    const totalLiabilities = liabilities.reduce((sum, entry) => sum + entry.amount, 0)

    const netWorth = totalAssets - totalLiabilities
    const liquidAssets = assets
      .filter((entry) => ['cash', 'deposit'].includes(entry.category))
      .reduce((sum, entry) => sum + entry.amount, 0)
    const riskyAssets = assets
      .filter((entry) => ['stock', 'crypto'].includes(entry.category))
      .reduce((sum, entry) => sum + entry.amount, 0)

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
  }, [assets])

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
    const confirmed = window.confirm('현재 기록을 샘플 데이터로 덮어쓸까요?')

    if (!confirmed) {
      return
    }

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

  const topAllocation = grouped[0]
  const categoryOptions = draft.type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES
  const latestUpdatedAt = recentEntries[0]?.updatedAt
  const netWorthTone = summary.netWorth >= 0 ? 'positive' : 'negative'

  function renderEntryCard(entry: PortfolioEntry) {
    return (
      <article className={`entry-card ${entry.type}`} key={entry.id}>
        <div className="entry-card-top">
          <div>
            <span className={`badge ${entry.type}`}>
              {entry.type === 'asset' ? 'ASSET' : 'DEBT'}
            </span>
            <h3>{entry.name}</h3>
          </div>

          <button type="button" className="text-button" onClick={() => handleDelete(entry.id)}>
            삭제
          </button>
        </div>

        <strong className="entry-card-amount">
          {entry.type === 'asset' ? '+' : '-'}
          {formatCurrency(entry.amount)}
        </strong>

        <p className="entry-card-note">{entry.note || '메모 없음'}</p>

        <div className="entry-card-meta">
          <span>{CATEGORY_LABELS[entry.category]}</span>
          <span>{formatDate(entry.updatedAt)}</span>
        </div>
      </article>
    )
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">QUIET LEDGER</p>
          <h1>
            <span>내 자산을 차분하게 읽는</span>
            <span>개인 웰스 데스크</span>
          </h1>
          <p className="hero-text">
            과장된 트레이딩 화면이 아니라, 자산과 부채를 한눈에 정리하는 개인 금융 보드입니다.
            데이터는 브라우저에 저장되고 JSON 백업으로 옮길 수 있습니다.
          </p>

          <div className="hero-actions">
            <button type="button" className="button-primary" onClick={handleExport}>
              백업 내보내기
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              백업 불러오기
            </button>
            <button type="button" className="button-secondary danger" onClick={handleReset}>
              샘플 데이터 복원
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={handleImport}
            />
          </div>
        </div>

        <aside className="hero-rail">
          <article className={`signal-card ${netWorthTone}`}>
            <span className="signal-label">현재 순자산</span>
            <strong>{formatCurrency(summary.netWorth)}</strong>
            <p>
              {latestUpdatedAt
                ? `${formatDate(latestUpdatedAt)} 기준으로 최근 기록이 반영돼 있습니다.`
                : '첫 항목을 추가하면 자산 상태가 이곳에 요약됩니다.'}
            </p>
          </article>

          <div className="mini-grid">
            <article className="mini-card">
              <span>최대 비중</span>
              <strong>{topAllocation ? topAllocation.label : '미계산'}</strong>
              <small>{topAllocation ? `${topAllocation.share}%` : '자산 입력 후 계산'}</small>
            </article>
            <article className="mini-card">
              <span>입력 항목</span>
              <strong>{entries.length}개</strong>
              <small>
                자산 {assets.length}개 · 부채 {liabilities.length}개
              </small>
            </article>
            <article className="mini-card">
              <span>위험자산</span>
              <strong>{summary.riskyRatio}%</strong>
              <small>주식/가상자산 비중</small>
            </article>
          </div>
        </aside>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">총자산</span>
          <strong>{formatCurrency(summary.totalAssets)}</strong>
          <p>현금, 예적금, 투자자산 포함</p>
        </article>
        <article className={`metric-card emphasis ${netWorthTone}`}>
          <span className="metric-label">순자산</span>
          <strong>{formatCurrency(summary.netWorth)}</strong>
          <p>총자산에서 총부채를 차감한 값</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">유동자산</span>
          <strong>{formatCurrency(summary.liquidAssets)}</strong>
          <p>현금 + 예적금 기준</p>
        </article>
        <article className="metric-card risk">
          <span className="metric-label">레버리지</span>
          <strong>{summary.leverageRatio}%</strong>
          <p>총부채 / 총자산</p>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel composer-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Compose</p>
              <h2>자산과 부채를 입력하는 작업 영역</h2>
            </div>
            <p className="panel-hint">
              이름, 카테고리, 메모를 같이 남겨서 나중에 봐도 맥락이 남도록 구성합니다.
            </p>
          </div>

          <div className="composer-layout">
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
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_LABELS[category]}
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
                  rows={5}
                  value={draft.note}
                  onChange={(event) => handleDraftChange('note', event.target.value)}
                  placeholder="만기, 투자전략, 상환조건, 계좌 목적 등을 적어두세요."
                />
              </label>

              <button className="button-primary submit-button" type="submit">
                항목 추가
              </button>
            </form>

            <aside className={`draft-preview ${draft.type}`}>
              <span className="draft-label">Live Preview</span>
              <h3>{draft.name.trim() || '새 항목 미리보기'}</h3>
              <p className="draft-meta">
                {draft.type === 'asset' ? '자산' : '부채'} · {CATEGORY_LABELS[draft.category]}
              </p>
              <strong>{draft.amount > 0 ? formatCurrency(draft.amount) : '금액 미입력'}</strong>
              <p className="draft-note">
                {draft.note.trim()
                  ? draft.note
                  : '메모를 적어두면 나중에 만기, 목적, 상환조건을 더 빨리 파악할 수 있습니다.'}
              </p>
            </aside>
          </div>
        </article>

        <article className="panel allocation-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Allocation</p>
              <h2>자산 구성과 집중도</h2>
            </div>
            <p className="panel-hint">
              자산 항목만 기준으로 어디에 비중이 몰려 있는지 빠르게 확인합니다.
            </p>
          </div>

          <div className="allocation-hero">
            <div>
              <span className="allocation-kicker">집중도</span>
              <strong>{topAllocation ? `${topAllocation.share}%` : '0%'}</strong>
              <p>{topAllocation ? `${topAllocation.label} 비중이 가장 큽니다.` : '자산 입력 후 계산됩니다.'}</p>
            </div>
            <div className="allocation-side-note">
              <span>총부채</span>
              <strong>{formatCurrency(summary.totalLiabilities)}</strong>
            </div>
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

      <section className="board-grid">
        <article className="panel ledger-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Assets</p>
              <h2>보유 자산</h2>
            </div>
            <p className="panel-hint">{assets.length}개 항목 · 금액 큰 순서</p>
          </div>

          <div className="entry-list">
            {assets.length > 0 ? (
              assets.map(renderEntryCard)
            ) : (
              <p className="empty-state">아직 입력된 자산이 없습니다.</p>
            )}
          </div>
        </article>

        <article className="panel ledger-panel liability-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Liabilities</p>
              <h2>부채와 미지급 항목</h2>
            </div>
            <p className="panel-hint">{liabilities.length}개 항목 · 금액 큰 순서</p>
          </div>

          <div className="entry-list">
            {liabilities.length > 0 ? (
              liabilities.map(renderEntryCard)
            ) : (
              <p className="empty-state">아직 입력된 부채가 없습니다.</p>
            )}
          </div>
        </article>

        <article className="panel activity-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Recent</p>
              <h2>최근 업데이트</h2>
            </div>
            <p className="panel-hint">가장 최근에 수정된 항목 6개</p>
          </div>

          <div className="activity-list">
            {recentEntries.length > 0 ? (
              recentEntries.map((entry) => (
                <article className="activity-card" key={entry.id}>
                  <div className="activity-line" />
                  <div className="activity-body">
                    <div className="activity-top">
                      <span className={`badge ${entry.type}`}>
                        {entry.type === 'asset' ? 'ASSET' : 'DEBT'}
                      </span>
                      <span className="activity-date">{formatDate(entry.updatedAt)}</span>
                    </div>
                    <strong>{entry.name}</strong>
                    <p>
                      {CATEGORY_LABELS[entry.category]} · {formatCurrency(entry.amount)}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">아직 기록이 없어 최근 업데이트를 표시할 수 없습니다.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
