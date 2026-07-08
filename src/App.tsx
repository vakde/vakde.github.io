import { useEffect, useMemo, useState, type ComponentProps } from 'react'
import './App.css'

type StrategyMode = 'mume' | 'vr'
type TradeType = 'buy' | 'sell'
type VrStartMode = 'new' | 'running'

type Stock = {
  id: string
  name: string
  ticker: string
  market: string
  referencePrice: number
}

type MumeVersion = {
  id: 'v2.2' | 'v3' | 'v4'
  label: string
  defaultDivision: number
  defaultTargetProfit: number
  note: string
}

type VrVersion = {
  id: 'lump' | 'contribution' | 'withdrawal'
  label: string
  note: string
}

type Position = {
  currentPrice: number
  avgPrice: number
  holdingQty: number
  totalBuy: number
  totalSell: number
}

type Transaction = {
  id: string
  at: string
  date: string
  stockId: string
  strategy: StrategyMode
  type: TradeType
  price: number
  quantity: number
  fee: number
  memo: string
  cycleId?: string
  tDelta?: number
  tMultiplier?: number
}

type CompletedReport = {
  id: string
  strategy: StrategyMode
  stockId: string
  version: string
  alias: string
  tags: string[]
  startDate: string
  endDate: string
  totalBuy: number
  totalSell: number
  marketValue: number
  pnl: number
  profitRate: number
  seedProfitRate: number
  tradeCount: number
}

type DraftTransaction = {
  type: TradeType
  date: string
  price: number
  quantity: number
  fee: number
  memo: string
  tDelta: number
  tMultiplier: number
}

type StockSettings = {
  alias: string
  tags: string
  strategyMode: StrategyMode
  mumeVersionId: MumeVersion['id']
  vrVersionId: VrVersion['id']
  seed: number
  divisionDate: number
  targetProfit: number
  mumeBuyingUnit: number
  mumeQuarterMode: boolean
  mumeQuarterModeCount: number
  mumeReverseMode: boolean
  mumeReverseStarPrice: number
  mumeCycleId: string
  tValue: number
  commissionRate: number
  vrStartMode: VrStartMode
  vrCurrentV: number
  vrStartAvgPrice: number
  vrStartQty: number
  vrStartPool: number
  vrPool: number
  vrPoolLimit: number
  vrBandPercent: number
  vrGradient: number
  vrRegularAmount: number
  vrOrderUnit: number
  vrStartDate: string
  vrEndDate: string
}

type AppState = {
  storageVersion: number
  selectedStockId: string
  selectedStockByStrategy: Record<StrategyMode, string>
  alias: string
  tags: string
  strategyMode: StrategyMode
  mumeVersionId: MumeVersion['id']
  vrVersionId: VrVersion['id']
  seed: number
  divisionDate: number
  targetProfit: number
  mumeBuyingUnit: number
  mumeQuarterMode: boolean
  mumeQuarterModeCount: number
  mumeReverseMode: boolean
  mumeReverseStarPrice: number
  mumeCycleId: string
  tValue: number
  commissionRate: number
  vrStartMode: VrStartMode
  vrCurrentV: number
  vrStartAvgPrice: number
  vrStartQty: number
  vrStartPool: number
  vrPool: number
  vrPoolLimit: number
  vrBandPercent: number
  vrGradient: number
  vrRegularAmount: number
  vrOrderUnit: number
  vrStartDate: string
  vrEndDate: string
  positions: Record<string, Position>
  transactions: Transaction[]
  reports: CompletedReport[]
  stockSettings: Record<string, StockSettings>
}

type OrderLine = {
  title: string
  method: string
  price: number
  quantity: number
  amount: number
  note: string
}

type MumeGuide = {
  phase: string
  unit: number
  investedValue: number
  remainingSeed: number
  marketValue: number
  pnl: number
  pnlRate: number
  tValue: number
  starPercent: number
  starPrice: number
  targetSellPrice: number
  progress: number
  buyOrders: OrderLine[]
  sellOrders: OrderLine[]
}

type VrGuide = {
  status: string
  targetValue: number
  lowerValue: number
  upperValue: number
  marketValue: number
  actionAmount: number
  actionQty: number
  actionPrice: number
  poolAfter: number
  poolStart: number
  poolUsed: number
  poolUsedPercent: number
  poolAllowed: number
  poolRemainingAllowed: number
  vNow: number
  nextCycleV: number
  nextCyclePool: number
  note: string
  cycleDue: boolean
}

type VrReservedOrder = {
  quantity: number
  price: number
  poolBalance: number
}

type VrOrderBook = {
  minV: number
  maxV: number
  buyOrders: VrReservedOrder[]
  sellOrders: VrReservedOrder[]
}

type ReportSummary = {
  totalBuy: number
  totalSell: number
  marketValue: number
  poolValue: number
  pnl: number
  profitRate: number
  seedProfitRate: number
  tradeCount: number
  bestStock: string
}

type CompletedReportSummary = {
  count: number
  pnl: number
  totalBuy: number
  totalSell: number
  winRate: number
}

type ReportStrategyFilter = 'all' | StrategyMode

type NaverStockBasicResponse = {
  closePrice?: string
  localTradedAt?: string
}

type NaverRealtimeResponse = {
  result?: {
    areas?: Array<{
      datas?: Array<{
        nv?: number | string
      }>
    }>
  }
}

const STORAGE_KEY = 'vakde-gate-state-v3'
const CURRENT_STORAGE_VERSION = 12
const FIRE_GATE_VR_BAND_PERCENT = 15
const NAVER_STOCK_BASIC_URL = 'https://m.stock.naver.com/api/stock'
const NAVER_REALTIME_URL = 'https://polling.finance.naver.com/api/realtime'
const READER_PROXY_URL = 'https://r.jina.ai/http://r.jina.ai/http://'

const STOCKS: Stock[] = [
  {
    id: 'hynix',
    name: 'TIGER SK하이닉스단일종목레버리지',
    ticker: '0195S0',
    market: 'KOSPI ETF',
    referencePrice: 23390,
  },
  {
    id: 'samsung',
    name: 'TIGER 삼성전자단일종목레버리지',
    ticker: '0195R0',
    market: 'KOSPI ETF',
    referencePrice: 18805,
  },
  {
    id: 'samcns',
    name: '샘씨엔에스',
    ticker: '252990',
    market: 'KOSDAQ',
    referencePrice: 12200,
  },
]

const STRATEGY_MODES: StrategyMode[] = ['vr', 'mume']

const MUME_VERSIONS: MumeVersion[] = [
  {
    id: 'v2.2',
    label: 'v2.2',
    defaultDivision: 40,
    defaultTargetProfit: 10,
    note: '40분할, 완만한 수익 기준',
  },
  {
    id: 'v3',
    label: 'v3',
    defaultDivision: 20,
    defaultTargetProfit: 15,
    note: '20분할, 수익금 재투입',
  },
  {
    id: 'v4',
    label: 'v4',
    defaultDivision: 20,
    defaultTargetProfit: 20,
    note: 'T값, 리버스 모드',
  },
]

const VR_VERSIONS: VrVersion[] = [
  { id: 'lump', label: '거치식', note: '현금 안에서 운용' },
  { id: 'contribution', label: '적립식', note: '사이클마다 적립' },
  { id: 'withdrawal', label: '인출식', note: '사이클마다 인출' },
]

function createEmptyPosition(stock: Stock, currentPrice = stock.referencePrice): Position {
  return {
    currentPrice,
    avgPrice: 0,
    holdingQty: 0,
    totalBuy: 0,
    totalSell: 0,
  }
}

function getPositionKey(stockId: string, strategy: StrategyMode): string {
  return `${stockId}:${strategy}`
}

const DEFAULT_POSITIONS = STOCKS.reduce<Record<string, Position>>((positions, stock) => {
  STRATEGY_MODES.forEach((strategy) => {
    positions[getPositionKey(stock.id, strategy)] = createEmptyPosition(stock)
  })

  return positions
}, {})

const DEFAULT_STATE: AppState = {
  storageVersion: CURRENT_STORAGE_VERSION,
  selectedStockId: STOCKS[0].id,
  selectedStockByStrategy: {
    vr: STOCKS[0].id,
    mume: STOCKS[0].id,
  },
  alias: '',
  tags: '',
  strategyMode: 'vr',
  mumeVersionId: 'v3',
  vrVersionId: 'lump',
  seed: 10000000,
  divisionDate: 20,
  targetProfit: 15,
  mumeBuyingUnit: 500000,
  mumeQuarterMode: false,
  mumeQuarterModeCount: 0,
  mumeReverseMode: false,
  mumeReverseStarPrice: 0,
  mumeCycleId: 'legacy',
  tValue: 0,
  commissionRate: 0.015,
  vrStartMode: 'new',
  vrCurrentV: 0,
  vrStartAvgPrice: 0,
  vrStartQty: 0,
  vrStartPool: 3000000,
  vrPool: 3000000,
  vrPoolLimit: 50,
  vrBandPercent: FIRE_GATE_VR_BAND_PERCENT,
  vrGradient: 10,
  vrRegularAmount: 1000000,
  vrOrderUnit: 1,
  vrStartDate: getNextMondayIso(),
  vrEndDate: getCycleEndDate(getNextMondayIso()),
  positions: DEFAULT_POSITIONS,
  transactions: [],
  reports: [],
  stockSettings: {},
}

const DEFAULT_DRAFT = {
  type: 'buy' as TradeType,
  date: getTodayIso(),
  price: STOCKS[0].referencePrice,
  quantity: 1,
  fee: 0,
  memo: '',
  tDelta: 0,
  tMultiplier: 0.75,
} satisfies DraftTransaction

function normalizeStockId(value: unknown, fallback = DEFAULT_STATE.selectedStockId): string {
  return typeof value === 'string' && STOCKS.some((stock) => stock.id === value) ? value : fallback
}

function getRecentTransactionStockId(transactions: Transaction[], strategy: StrategyMode): string | null {
  const recentTransaction = transactions
    .filter((transaction) => transaction.strategy === strategy && STOCKS.some((stock) => stock.id === transaction.stockId))
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())[0]

  return recentTransaction?.stockId ?? null
}

function getPositionStockId(positions: Record<string, Position>, strategy: StrategyMode): string | null {
  return (
    STOCKS.find((stock) => hasPositionData(positions[getPositionKey(stock.id, strategy)]))?.id ??
    null
  )
}

function normalizeSelectedStockByStrategy(
  value: unknown,
  currentStockId: string,
  currentStrategy: StrategyMode,
  positions: Record<string, Position>,
  transactions: Transaction[],
): Record<StrategyMode, string> {
  const storedValue =
    value && typeof value === 'object'
      ? (value as Partial<Record<StrategyMode, unknown>>)
      : {}

  const getFallback = (strategy: StrategyMode) =>
    currentStrategy === strategy
      ? currentStockId
      : getRecentTransactionStockId(transactions, strategy) ??
        getPositionStockId(positions, strategy) ??
        currentStockId

  return {
    vr: normalizeStockId(storedValue.vr, getFallback('vr')),
    mume: normalizeStockId(storedValue.mume, getFallback('mume')),
    [currentStrategy]: currentStockId,
  }
}

function normalizeStoredState(stored: Partial<AppState>): AppState {
  const storedVersion = positive(stored.storageVersion ?? 0)
  const needsLegacyStrategyDefault =
    storedVersion < CURRENT_STORAGE_VERSION
  const needsVrBandDefaultUpgrade = storedVersion < CURRENT_STORAGE_VERSION
  const storedVersionId: VrVersion['id'] =
    VR_VERSIONS.some((version) => version.id === stored.vrVersionId)
      ? (stored.vrVersionId as VrVersion['id'])
      : DEFAULT_STATE.vrVersionId
  const storedMumeVersionId: MumeVersion['id'] =
    MUME_VERSIONS.some((version) => version.id === stored.mumeVersionId)
      ? (stored.mumeVersionId as MumeVersion['id'])
      : DEFAULT_STATE.mumeVersionId
  const storedStockId = STOCKS.some((stock) => stock.id === stored.selectedStockId)
    ? stored.selectedStockId
    : DEFAULT_STATE.selectedStockId
  const normalizedStrategyMode = isStrategyMode(stored.strategyMode)
    ? stored.strategyMode
    : DEFAULT_STATE.strategyMode

  const rawVrStartDate = stored.vrStartDate ?? DEFAULT_STATE.vrStartDate
  const normalizedVrStartDate = getMondayOnOrAfterIso(rawVrStartDate)
  const normalizedVrEndDate =
    rawVrStartDate === normalizedVrStartDate && stored.vrEndDate
      ? stored.vrEndDate
      : getCycleEndDate(normalizedVrStartDate)
  const normalizedStockSettings = normalizeStockSettings(stored.stockSettings, storedVersion)
  const storedTransactions = Array.isArray(stored.transactions) ? stored.transactions : []
  const normalizedVrStartMode = normalizeVrStartMode(stored.vrStartMode, stored.vrStartQty)
  const normalizedVrStartAvgPrice = stored.vrStartAvgPrice ?? DEFAULT_STATE.vrStartAvgPrice
  const normalizedVrStartQty = stored.vrStartQty ?? DEFAULT_STATE.vrStartQty
  const storedVrBandPercent = stored.vrBandPercent ?? DEFAULT_STATE.vrBandPercent
  const normalizedVrBandPercent =
    needsVrBandDefaultUpgrade && Number(storedVrBandPercent) === 10
      ? DEFAULT_STATE.vrBandPercent
      : storedVrBandPercent
  const normalizedPositions = normalizePositions(stored.positions, storedTransactions, normalizedStockSettings)
  const normalizedSelectedStockByStrategy = normalizeSelectedStockByStrategy(
    stored.selectedStockByStrategy,
    storedStockId ?? DEFAULT_STATE.selectedStockId,
    normalizedStrategyMode,
    normalizedPositions,
    storedTransactions,
  )

  const normalized: AppState = {
    ...DEFAULT_STATE,
    ...stored,
    storageVersion: CURRENT_STORAGE_VERSION,
    selectedStockId: storedStockId ?? DEFAULT_STATE.selectedStockId,
    selectedStockByStrategy: normalizedSelectedStockByStrategy,
    alias: normalizeTextValue(stored.alias),
    tags: normalizeTextValue(stored.tags),
    strategyMode: normalizedStrategyMode,
    mumeVersionId: storedMumeVersionId,
    vrVersionId: storedVersionId,
    vrStartMode: normalizedVrStartMode,
    vrCurrentV:
      normalizedVrStartMode === 'new'
        ? getAutoVrStartValue(normalizedVrStartAvgPrice, normalizedVrStartQty)
        : stored.vrCurrentV ?? DEFAULT_STATE.vrCurrentV,
    vrStartAvgPrice: normalizedVrStartAvgPrice,
    vrStartQty: normalizedVrStartQty,
    vrStartPool: stored.vrStartPool ?? stored.vrPool ?? DEFAULT_STATE.vrStartPool,
    vrGradient: stored.vrGradient ?? DEFAULT_STATE.vrGradient,
    vrOrderUnit: stored.vrOrderUnit ?? DEFAULT_STATE.vrOrderUnit,
    vrBandPercent: normalizedVrBandPercent,
    vrRegularAmount:
      stored.vrRegularAmount ??
      (stored as Partial<AppState> & { vrContribution?: number }).vrContribution ??
      DEFAULT_STATE.vrRegularAmount,
    mumeBuyingUnit:
      stored.mumeBuyingUnit ??
      (stored.seed ? stored.seed / (stored.divisionDate ?? DEFAULT_STATE.divisionDate) : DEFAULT_STATE.mumeBuyingUnit),
    mumeQuarterMode: stored.mumeQuarterMode ?? DEFAULT_STATE.mumeQuarterMode,
    mumeQuarterModeCount: stored.mumeQuarterModeCount ?? DEFAULT_STATE.mumeQuarterModeCount,
    mumeReverseMode: stored.mumeReverseMode ?? DEFAULT_STATE.mumeReverseMode,
    mumeReverseStarPrice: stored.mumeReverseStarPrice ?? DEFAULT_STATE.mumeReverseStarPrice,
    mumeCycleId: stored.mumeCycleId ?? DEFAULT_STATE.mumeCycleId,
    vrStartDate: normalizedVrStartDate,
    vrEndDate: normalizedVrEndDate,
    positions: normalizedPositions,
    transactions: storedTransactions,
    reports: normalizeCompletedReports(stored.reports),
    stockSettings: normalizedStockSettings,
  }

  const nextStrategyMode = needsLegacyStrategyDefault
    ? resolveVisibleStrategyMode(normalized, normalized.selectedStockId, normalized.strategyMode)
    : normalized.strategyMode

  return syncCurrentStockSettings({
    ...normalized,
    strategyMode: nextStrategyMode,
    selectedStockByStrategy: {
      ...normalized.selectedStockByStrategy,
      [nextStrategyMode]: normalized.selectedStockId,
    },
  })
}

function readStoredState(): AppState {
  if (typeof window === 'undefined') {
    return syncCurrentStockSettings(DEFAULT_STATE)
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return syncCurrentStockSettings(DEFAULT_STATE)
    }

    return normalizeStoredState(JSON.parse(raw) as Partial<AppState>)
  } catch {
    return syncCurrentStockSettings(DEFAULT_STATE)
  }
}

function getStock(stockId: string): Stock {
  return STOCKS.find((stock) => stock.id === stockId) ?? STOCKS[0]
}

function getStrategyLabel(strategy: StrategyMode): string {
  return strategy === 'vr' ? '리밸런싱' : '분할매수'
}

function getPosition(
  state: AppState,
  stockId: string,
  strategy: StrategyMode = state.strategyMode,
): Position {
  const stock = getStock(stockId)

  return (
    state.positions[getPositionKey(stockId, strategy)] ??
    state.positions[stockId] ??
    createEmptyPosition(stock)
  )
}

function createDraftForState(
  state: AppState,
  baseDraft: DraftTransaction = DEFAULT_DRAFT,
): DraftTransaction {
  const stock = getStock(state.selectedStockId)
  const position = getPosition(state, state.selectedStockId, state.strategyMode)

  return {
    ...baseDraft,
    date: getStrategyTradeDate(state, baseDraft.date || getTodayIso()),
    price: positive(position.currentPrice) || stock.referencePrice,
  }
}

function hasPositionData(position: Position): boolean {
  return (
    positive(position.holdingQty) > 0 ||
    positive(position.totalBuy) > 0 ||
    positive(position.totalSell) > 0
  )
}

function resolveVisibleStrategyMode(
  state: AppState,
  stockId: string,
  candidate: StrategyMode,
): StrategyMode {
  if (candidate !== 'mume') {
    return candidate
  }

  const hasMumeTransactions = state.transactions.some(
    (transaction) => transaction.stockId === stockId && transaction.strategy === 'mume',
  )

  return hasMumeTransactions || hasPositionData(getPosition(state, stockId, 'mume')) ? 'mume' : 'vr'
}

const STOCK_SETTING_KEYS = new Set<keyof StockSettings>([
  'alias',
  'tags',
  'strategyMode',
  'mumeVersionId',
  'vrVersionId',
  'seed',
  'divisionDate',
  'targetProfit',
  'mumeBuyingUnit',
  'mumeQuarterMode',
  'mumeQuarterModeCount',
  'mumeReverseMode',
  'mumeReverseStarPrice',
  'mumeCycleId',
  'tValue',
  'commissionRate',
  'vrStartMode',
  'vrCurrentV',
  'vrStartAvgPrice',
  'vrStartQty',
  'vrStartPool',
  'vrPool',
  'vrPoolLimit',
  'vrBandPercent',
  'vrGradient',
  'vrRegularAmount',
  'vrOrderUnit',
  'vrStartDate',
  'vrEndDate',
])

function getDefaultStockSettings(): StockSettings {
  const startDate = getNextMondayIso()

  return {
    alias: '',
    tags: '',
    strategyMode: 'vr',
    mumeVersionId: 'v3',
    vrVersionId: 'lump',
    seed: 10000000,
    divisionDate: 20,
    targetProfit: 15,
    mumeBuyingUnit: 500000,
    mumeQuarterMode: false,
    mumeQuarterModeCount: 0,
    mumeReverseMode: false,
    mumeReverseStarPrice: 0,
    mumeCycleId: 'legacy',
    tValue: 0,
    commissionRate: 0.015,
    vrStartMode: 'new',
    vrCurrentV: 0,
    vrStartAvgPrice: 0,
    vrStartQty: 0,
    vrStartPool: 3000000,
    vrPool: 3000000,
    vrPoolLimit: 50,
    vrBandPercent: FIRE_GATE_VR_BAND_PERCENT,
    vrGradient: 10,
    vrRegularAmount: 1000000,
    vrOrderUnit: 1,
    vrStartDate: startDate,
    vrEndDate: getCycleEndDate(startDate),
  }
}

function isStrategyMode(value: unknown): value is StrategyMode {
  return value === 'mume' || value === 'vr'
}

function normalizeVrStartMode(value: unknown, startQty: unknown): VrStartMode {
  if (value === 'new' || value === 'running') {
    return value
  }

  const quantity =
    typeof startQty === 'number' && Number.isFinite(startQty)
      ? startQty
      : typeof startQty === 'string'
        ? Number(startQty)
        : 0

  if (positive(quantity) > 0) {
    return 'running'
  }

  return 'new'
}

function normalizePosition(position: Partial<Position> | undefined, stock: Stock): Position {
  return {
    currentPrice: positive(position?.currentPrice ?? 0) || stock.referencePrice,
    avgPrice: positive(position?.avgPrice ?? 0),
    holdingQty: positive(position?.holdingQty ?? 0),
    totalBuy: positive(position?.totalBuy ?? 0),
    totalSell: positive(position?.totalSell ?? 0),
  }
}

function inferLegacyPositionStrategy(
  stockId: string,
  transactions: Transaction[],
  stockSettings: Record<string, StockSettings>,
): StrategyMode {
  const stockTransactions = transactions.filter((transaction) => transaction.stockId === stockId)
  const hasVr = stockTransactions.some((transaction) => transaction.strategy === 'vr')
  const hasMume = stockTransactions.some((transaction) => transaction.strategy === 'mume')

  if (hasVr && !hasMume) {
    return 'vr'
  }

  if (hasMume && !hasVr) {
    return 'mume'
  }

  return stockSettings[stockId]?.strategyMode ?? 'vr'
}

function normalizePositions(
  positions: unknown,
  transactions: Transaction[],
  stockSettings: Record<string, StockSettings>,
): Record<string, Position> {
  const nextPositions = { ...DEFAULT_POSITIONS }

  if (!positions || typeof positions !== 'object') {
    return nextPositions
  }

  Object.entries(positions as Record<string, Partial<Position>>).forEach(([key, position]) => {
    const [stockId, strategy] = key.split(':')
    const stock = getStock(stockId)

    if (STOCKS.some((item) => item.id === stockId) && isStrategyMode(strategy)) {
      nextPositions[getPositionKey(stockId, strategy)] = normalizePosition(position, stock)
      return
    }

    if (STOCKS.some((item) => item.id === key)) {
      const legacyStock = getStock(key)
      const legacyStrategy = inferLegacyPositionStrategy(key, transactions, stockSettings)

      nextPositions[getPositionKey(key, legacyStrategy)] = normalizePosition(position, legacyStock)
    }
  })

  return nextPositions
}

function normalizeCompletedReports(reports: unknown): CompletedReport[] {
  if (!Array.isArray(reports)) {
    return []
  }

  return reports
    .filter((report): report is Partial<CompletedReport> => Boolean(report) && typeof report === 'object')
    .map((report) => ({
      id: normalizeTextValue(report.id) || createTransactionId(),
      strategy: isStrategyMode(report.strategy) ? report.strategy : 'mume',
      stockId: STOCKS.some((stock) => stock.id === report.stockId)
        ? normalizeTextValue(report.stockId)
        : STOCKS[0].id,
      version: normalizeTextValue(report.version),
      alias: normalizeTextValue(report.alias),
      tags: Array.isArray(report.tags)
        ? report.tags.map(normalizeTextValue).filter(Boolean).slice(0, 8)
        : [],
      startDate: normalizeTextValue(report.startDate) || getTodayIso(),
      endDate: normalizeTextValue(report.endDate) || getTodayIso(),
      totalBuy: positive(report.totalBuy ?? 0),
      totalSell: positive(report.totalSell ?? 0),
      marketValue: positive(report.marketValue ?? 0),
      pnl: Number.isFinite(report.pnl) ? Number(report.pnl) : 0,
      profitRate: Number.isFinite(report.profitRate) ? Number(report.profitRate) : 0,
      seedProfitRate: Number.isFinite(report.seedProfitRate) ? Number(report.seedProfitRate) : 0,
      tradeCount: positive(report.tradeCount ?? 0),
    }))
}

function extractStockSettings(state: AppState): StockSettings {
  return {
    alias: state.alias,
    tags: state.tags,
    strategyMode: state.strategyMode,
    mumeVersionId: state.mumeVersionId,
    vrVersionId: state.vrVersionId,
    seed: state.seed,
    divisionDate: state.divisionDate,
    targetProfit: state.targetProfit,
    mumeBuyingUnit: state.mumeBuyingUnit,
    mumeQuarterMode: state.mumeQuarterMode,
    mumeQuarterModeCount: state.mumeQuarterModeCount,
    mumeReverseMode: state.mumeReverseMode,
    mumeReverseStarPrice: state.mumeReverseStarPrice,
    mumeCycleId: state.mumeCycleId,
    tValue: state.tValue,
    commissionRate: state.commissionRate,
    vrStartMode: state.vrStartMode,
    vrCurrentV: state.vrCurrentV,
    vrStartAvgPrice: state.vrStartAvgPrice,
    vrStartQty: state.vrStartQty,
    vrStartPool: state.vrStartPool,
    vrPool: state.vrPool,
    vrPoolLimit: state.vrPoolLimit,
    vrBandPercent: state.vrBandPercent,
    vrGradient: state.vrGradient,
    vrRegularAmount: state.vrRegularAmount,
    vrOrderUnit: state.vrOrderUnit,
    vrStartDate: state.vrStartDate,
    vrEndDate: state.vrEndDate,
  }
}

function normalizeStockSettings(
  settings: unknown,
  storageVersion = CURRENT_STORAGE_VERSION,
): Record<string, StockSettings> {
  if (!settings || typeof settings !== 'object') {
    return {}
  }

  const needsVrBandDefaultUpgrade = positive(storageVersion) < CURRENT_STORAGE_VERSION

  return Object.entries(settings as Record<string, Partial<StockSettings>>).reduce<
    Record<string, StockSettings>
  >((nextSettings, [stockId, stockSettings]) => {
    if (!STOCKS.some((stock) => stock.id === stockId)) {
      return nextSettings
    }
    const rawSettings = {
      ...getDefaultStockSettings(),
      ...stockSettings,
    }
    const rawVrStartDate = rawSettings.vrStartDate
    const normalizedVrStartDate = getMondayOnOrAfterIso(rawVrStartDate)
    const normalizedVrStartMode = normalizeVrStartMode(
      stockSettings.vrStartMode,
      stockSettings.vrStartQty,
    )
    const rawVrBandPercent = stockSettings.vrBandPercent ?? rawSettings.vrBandPercent

    nextSettings[stockId] = {
      ...rawSettings,
      alias: normalizeTextValue(stockSettings.alias),
      tags: normalizeTextValue(stockSettings.tags),
      strategyMode:
        stockSettings.strategyMode === 'mume' || stockSettings.strategyMode === 'vr'
          ? stockSettings.strategyMode
          : 'vr',
      mumeVersionId: MUME_VERSIONS.some((version) => version.id === stockSettings.mumeVersionId)
        ? (stockSettings.mumeVersionId as MumeVersion['id'])
        : 'v3',
      vrVersionId: VR_VERSIONS.some((version) => version.id === stockSettings.vrVersionId)
        ? (stockSettings.vrVersionId as VrVersion['id'])
        : 'lump',
      vrStartMode: normalizedVrStartMode,
      vrCurrentV:
        normalizedVrStartMode === 'new'
          ? getAutoVrStartValue(rawSettings.vrStartAvgPrice, rawSettings.vrStartQty)
          : rawSettings.vrCurrentV,
      vrBandPercent:
        needsVrBandDefaultUpgrade && Number(rawVrBandPercent) === 10
          ? DEFAULT_STATE.vrBandPercent
          : rawSettings.vrBandPercent,
      vrStartDate: normalizedVrStartDate,
      vrEndDate:
        rawVrStartDate === normalizedVrStartDate && rawSettings.vrEndDate
          ? rawSettings.vrEndDate
          : getCycleEndDate(normalizedVrStartDate),
    }

    return nextSettings
  }, {})
}

function isStockSettingKey(field: keyof AppState): field is keyof StockSettings {
  return STOCK_SETTING_KEYS.has(field as keyof StockSettings)
}

function syncCurrentStockSettings(state: AppState): AppState {
  return {
    ...state,
    stockSettings: {
      ...state.stockSettings,
      [state.selectedStockId]: extractStockSettings(state),
    },
  }
}

function applySettingsPatch(state: AppState, patch: Partial<StockSettings>): AppState {
  return syncCurrentStockSettings({
    ...state,
    ...patch,
  })
}

function collectStockSettings(state: AppState): Record<string, StockSettings> {
  return STOCKS.reduce<Record<string, StockSettings>>((settings, stock) => {
    settings[stock.id] = getSettingsForStock(state, stock.id)

    return settings
  }, {})
}

function applySelectedStockSettings(
  state: AppState,
  stockSettings: Record<string, StockSettings>,
): AppState {
  const selectedSettings = stockSettings[state.selectedStockId] ?? getDefaultStockSettings()

  return {
    ...state,
    ...selectedSettings,
    stockSettings,
  }
}

function getOperationState(
  state: AppState,
  stockId: string,
  strategyMode: StrategyMode,
): AppState {
  const nextStock = getStock(stockId)
  const currentSavedState = syncCurrentStockSettings(state)
  const savedNextSettings =
    currentSavedState.stockSettings[nextStock.id] ?? getDefaultStockSettings()

  return syncCurrentStockSettings({
    ...currentSavedState,
    ...savedNextSettings,
    selectedStockId: nextStock.id,
    strategyMode,
    selectedStockByStrategy: {
      ...currentSavedState.selectedStockByStrategy,
      [strategyMode]: nextStock.id,
    },
  })
}

function getSettingsForStock(state: AppState, stockId: string): StockSettings {
  return stockId === state.selectedStockId
    ? extractStockSettings(state)
    : state.stockSettings[stockId] ?? getDefaultStockSettings()
}

function isTransactionInActiveCycle(state: AppState, transaction: Transaction): boolean {
  const stockSettings = getSettingsForStock(state, transaction.stockId)

  if (transaction.strategy === 'mume') {
    return (transaction.cycleId ?? 'legacy') === stockSettings.mumeCycleId
  }

  return transaction.date >= stockSettings.vrStartDate
}

function formatMoney(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0

  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(Math.round(safeValue))
}

function formatNumber(value: number, digits = 0): string {
  const safeValue = Number.isFinite(value) ? value : 0

  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(safeValue)
}

function formatPercent(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0

  return `${safeValue >= 0 ? '+' : ''}${formatNumber(safeValue, 0)}%`
}

function normalizeTextValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function parseTags(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .filter((tag, index, tags) => tags.indexOf(tag) === index)
    .slice(0, 8)
}

function positive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function round(value: number, digits = 2): number {
  const scale = 10 ** digits

  return Math.round(value * scale) / scale
}

function getAutoVrStartValue(avgPrice: unknown, quantity: unknown): number {
  const normalizedAvgPrice = positive(Number(avgPrice))
  const normalizedQuantity = positive(Number(quantity))

  return normalizedAvgPrice > 0 && normalizedQuantity > 0
    ? round(normalizedAvgPrice * normalizedQuantity)
    : 0
}

function parseLocaleNumber(value: string): number {
  const parsed = Number(value.replace(/[^\d.-]/g, ''))

  return Number.isFinite(parsed) ? parsed : 0
}

async function fetchTextWithTimeout(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return response.text()
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function parseReaderJson<T>(text: string): T {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end <= start) {
    throw new Error('Reader JSON missing')
  }

  return JSON.parse(text.slice(start, end + 1)) as T
}

async function fetchReaderJson<T>(url: string): Promise<T> {
  const text = await fetchTextWithTimeout(`${READER_PROXY_URL}${url}`)

  return parseReaderJson<T>(text)
}

function formatNaverPriceTime(value: string | undefined): string {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

type NumberInputProps = Omit<ComponentProps<'input'>, 'value'> & {
  value: number | string
}

function NumberInput({
  value,
  onBlur,
  onChange,
  onClick,
  onFocus,
  onMouseDown,
  onPointerDown,
  type = 'number',
  ...props
}: NumberInputProps) {
  const [isBlankEditing, setIsBlankEditing] = useState(false)
  const numericValue = typeof value === 'number' ? value : Number(value)
  const visibleValue = isBlankEditing && numericValue === 0 ? '' : value
  const clearZero = (input: HTMLInputElement) => {
    if (!input.disabled && !input.readOnly && input.value === '0') {
      setIsBlankEditing(true)
    }
  }

  return (
    <input
      {...props}
      type={type}
      value={visibleValue}
      onBlur={(event) => {
        setIsBlankEditing(false)
        onBlur?.(event)
      }}
      onChange={(event) => {
        setIsBlankEditing(event.currentTarget.value === '')
        onChange?.(event)
      }}
      onClick={(event) => {
        clearZero(event.currentTarget)
        onClick?.(event)
      }}
      onFocus={(event) => {
        clearZero(event.currentTarget)
        onFocus?.(event)
      }}
      onMouseDown={(event) => {
        clearZero(event.currentTarget)
        onMouseDown?.(event)
      }}
      onPointerDown={(event) => {
        clearZero(event.currentTarget)
        onPointerDown?.(event)
      }}
    />
  )
}

function createTransactionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getTodayIso(): string {
  return toIsoDate(new Date())
}

function getStrategyTradeDate(state: AppState, fallbackDate = getTodayIso()): string {
  if (state.strategyMode === 'vr' && state.vrStartDate && fallbackDate < state.vrStartDate) {
    return state.vrStartDate
  }

  return fallbackDate
}

function getNextMondayIso(): string {
  const nextDate = new Date()
  const day = nextDate.getDay()

  nextDate.setHours(0, 0, 0, 0)

  if (day === 0) {
    nextDate.setDate(nextDate.getDate() + 1)
  } else if (day > 1) {
    nextDate.setDate(nextDate.getDate() + (8 - day))
  }

  return toIsoDate(nextDate)
}

function getMondayOnOrAfterIso(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return getNextMondayIso()
  }

  const day = date.getDay()

  if (day === 0) {
    date.setDate(date.getDate() + 1)
  } else if (day > 1) {
    date.setDate(date.getDate() + (8 - day))
  }

  return toIsoDate(date)
}

function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return getTodayIso()
  }

  date.setDate(date.getDate() + days)

  return toIsoDate(date)
}

function getMondayAfterIso(dateIso: string): string {
  return getMondayOnOrAfterIso(addDaysIso(dateIso, 1))
}

function getCycleEndDate(startIso: string): string {
  const startDate = new Date(`${startIso}T00:00:00`)

  if (Number.isNaN(startDate.getTime())) {
    return getTodayIso()
  }

  startDate.setDate(startDate.getDate() + 11)

  return toIsoDate(startDate)
}

function isVrCycleDue(state: AppState): boolean {
  if (!state.vrEndDate) {
    return false
  }

  const vrPosition = getPosition(state, state.selectedStockId, 'vr')
  const hasStartedCycle =
    positive(state.vrCurrentV) > 0 ||
    positive(state.vrStartQty) > 0 ||
    hasPositionData(vrPosition) ||
    state.transactions.some(
      (transaction) =>
        transaction.stockId === state.selectedStockId &&
        transaction.strategy === 'vr' &&
        transaction.date >= state.vrStartDate,
    )

  if (!hasStartedCycle) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (today.getDay() === 6) {
    return false
  }

  const startDate = new Date(`${state.vrStartDate}T00:00:00`)
  const endDate = new Date(`${state.vrEndDate}T00:00:00`)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return false
  }

  return positive(state.vrCurrentV) > 0 ? today > endDate : today >= startDate
}

function getVrVersion(versionId: string | undefined): VrVersion {
  return VR_VERSIONS.find((version) => version.id === versionId) ?? VR_VERSIONS[0]
}

function getVrVersionDefaults(versionId: VrVersion['id']): Pick<
  StockSettings,
  'vrGradient' | 'vrPoolLimit'
> {
  if (versionId === 'contribution') {
    return { vrGradient: 10, vrPoolLimit: 75 }
  }

  if (versionId === 'withdrawal') {
    return { vrGradient: 20, vrPoolLimit: 25 }
  }

  return { vrGradient: 10, vrPoolLimit: 50 }
}

function getExtraBuyUnit(quantity: number): number {
  if (quantity > 100) return 10
  if (quantity > 50) return 5
  return 1
}

function buildExtraBuyOrders(
  budget: number,
  baseQuantity: number,
  firstPrice: number,
  maxPrice: number,
  maxCount = 6,
  fillUntilCount = true,
): OrderLine[] {
  const quantityUnit = getExtraBuyUnit(baseQuantity)
  const orders: OrderLine[] = []
  let offset = quantityUnit

  while (orders.length < maxCount && offset <= 1000) {
    const quantity = baseQuantity + offset
    const price = round(budget / quantity)

    if (price > 0 && price < firstPrice && price < maxPrice) {
      orders.push({
        title: '추가 매수',
        method: 'LOC',
        price,
        quantity: quantityUnit,
        amount: price * quantityUnit,
        note: '더 내려가면 조금 더 매수',
      })
    }

    if (!fillUntilCount && offset >= quantityUnit * maxCount) {
      break
    }

    offset += quantityUnit
  }

  return orders
}

function getReverseMultiplier(divisionDate: number): number {
  if (divisionDate === 20) return 0.9
  if (divisionDate === 30) return 28 / 30
  return 0.95
}

function usesPrimaryLeveragedFormula(stock: Stock): boolean {
  return stock.id === 'hynix'
}

function getV4TargetProfit(stock: Stock): number {
  return usesPrimaryLeveragedFormula(stock) ? 15 : 20
}

function getV4StarPercent(stock: Stock, divisionDate: number, tValue: number): number {
  if (usesPrimaryLeveragedFormula(stock)) {
    if (divisionDate === 20) return 15 - 1.5 * tValue
    if (divisionDate === 30) return 15 - tValue
    return 15 - 0.75 * tValue
  }

  if (divisionDate === 20) return 20 - 2 * tValue
  if (divisionDate === 30) return 20 - (4 / 3) * tValue
  return 20 - tValue
}

function buildMumeGuide(state: AppState, position: Position, version: MumeVersion): MumeGuide {
  const stock = getStock(state.selectedStockId)
  const seed = positive(state.seed)
  const currentPrice = positive(position.currentPrice) || stock.referencePrice
  const avgPrice = positive(position.avgPrice)
  const holdingQty = positive(position.holdingQty)
  const totalBuy = positive(position.totalBuy)
  const totalSell = positive(position.totalSell)
  const divisionDate = Math.max(1, Math.round(positive(state.divisionDate) || version.defaultDivision))
  const targetProfit =
    version.id === 'v4'
      ? getV4TargetProfit(stock)
      : positive(state.targetProfit) || version.defaultTargetProfit
  const marketValue = holdingQty * currentPrice
  const investedValue = Math.max(0, totalBuy - totalSell)
  const bookValue = avgPrice * holdingQty
  const pnl = marketValue + totalSell - totalBuy
  const pnlRate = totalBuy > 0 ? (pnl / totalBuy) * 100 : 0
  const remainingSeed = Math.max(0, seed - investedValue)
  const realizedProfit = Math.max(0, totalSell - Math.max(0, totalBuy - bookValue))
  const baseUnit = seed / divisionDate
  const unit =
    version.id === 'v4'
      ? remainingSeed / Math.max(1, divisionDate - Math.floor(positive(state.tValue)))
      : version.id === 'v3'
        ? positive(state.mumeBuyingUnit) || baseUnit + realizedProfit / divisionDate
        : baseUnit
  const rawT = version.id === 'v4' ? positive(state.tValue) : unit > 0 ? investedValue / unit : 0
  const tValue = version.id === 'v3' ? Math.ceil(rawT * 10) / 10 : round(rawT, 2)
  const starSlope =
    version.id === 'v2.2'
      ? targetProfit * 0.05 * (40 / divisionDate)
      : targetProfit / Math.max(1, divisionDate / 2)
  const starPercent =
    version.id === 'v4'
      ? clamp(getV4StarPercent(stock, divisionDate, tValue), 0.3, targetProfit)
      : clamp(targetProfit - tValue * starSlope, 0.3, targetProfit)
  const starPrice = round((avgPrice || currentPrice) * (1 + starPercent / 100))
  const starBuyPrice = round(Math.max(0, starPrice - 0.01), 2)
  const targetSellPrice = round((avgPrice || currentPrice) * (1 + targetProfit / 100))
  const quarterQty = holdingQty > 0 ? Math.max(1, Math.floor(holdingQty / 4)) : 0
  const restQty = Math.max(0, holdingQty - quarterQty)
  const progress = seed > 0 ? clamp((investedValue / seed) * 100, 0, 100) : 0
  const isSeedExhausted = remainingSeed < unit * 0.6 && holdingQty > 0
  const isFirstHalf =
    version.id === 'v4'
      ? tValue < divisionDate / 2
      : investedValue < seed / 2
  const isReverseMode =
    version.id === 'v4' && (state.mumeReverseMode || tValue > divisionDate - 1)
  const isQuarterMode =
    version.id !== 'v4' &&
    !isSeedExhausted &&
    (state.mumeQuarterMode || positive(state.mumeQuarterModeCount) > 0)
  const phase =
    holdingQty <= 0
      ? '첫 매수'
      : isReverseMode
        ? '리버스'
        : isSeedExhausted && version.id !== 'v4'
          ? '시드 소진'
          : isQuarterMode
            ? '쿼터 손절'
            : isFirstHalf
              ? '전반전'
              : '후반전'
  const buyOrders: OrderLine[] = []
  const sellOrders: OrderLine[] = []

  if (version.id === 'v4' && holdingQty > 0 && isReverseMode) {
    const reverseDivider = divisionDate === 20 ? 10 : divisionDate === 30 ? 15 : 20
    const reverseSellQty = Math.floor(holdingQty / reverseDivider)
    const reversePrice = positive(state.mumeReverseStarPrice)

    if (reversePrice <= 0) {
      sellOrders.push({
        title: '리버스 첫날',
        method: 'MOC',
        price: currentPrice,
        quantity: reverseSellQty,
        amount: reverseSellQty * currentPrice,
        note: '리버스 기준가 대기',
      })
    } else {
      const buyPrice = round(reversePrice - 0.01)
      const buyQty = Math.floor(remainingSeed / 4 / buyPrice)

      buyOrders.push({
        title: '리버스 매수',
        method: 'LOC',
        price: buyPrice,
        quantity: buyQty,
        amount: buyQty * buyPrice,
        note: '리버스 매수',
      })
      sellOrders.push({
        title: '리버스 매도',
        method: 'LOC',
        price: reversePrice,
        quantity: reverseSellQty,
        amount: reverseSellQty * reversePrice,
        note: '리버스 매도',
      })
    }
  } else if (holdingQty <= 0) {
    const entryPrice = version.id === 'v4' ? currentPrice * 1.12 : currentPrice
    const entryQty = Math.floor(unit / entryPrice)

    buyOrders.push({
      title: version.id === 'v4' ? '첫 매수 상한' : '첫 매수',
      method: version.id === 'v4' ? 'LOC' : 'LOC/MOC',
      price: entryPrice,
      quantity: entryQty,
      amount: entryQty * entryPrice,
      note: version.id === 'v4' ? '현재가의 112% 상한' : '1회차 금액 안에서 진입',
    })
    if (version.id === 'v4') {
      buyOrders.push(...buildExtraBuyOrders(unit, entryQty, entryPrice, entryPrice, 7, false))
    }
  } else if (isSeedExhausted && version.id !== 'v4') {
    const sellQty = quarterQty || holdingQty

    sellOrders.push({
      title: '시드 회수',
      method: 'MOC',
      price: currentPrice,
      quantity: sellQty,
      amount: sellQty * currentPrice,
      note: '현금 확보 후 다음 회차 대기',
    })
    sellOrders.push({
      title: '목표가 잔량',
      method: 'After 지정가',
      price: targetSellPrice,
      quantity: Math.max(0, holdingQty - sellQty),
      amount: Math.max(0, holdingQty - sellQty) * targetSellPrice,
        note: `${formatNumber(targetProfit, 0)}% 목표`,
    })
  } else if (
    isQuarterMode
  ) {
    const cycleLength = version.id === 'v3' ? 5 : 10
    const modeIndex =
      state.mumeQuarterMode && state.mumeQuarterModeCount > 0
        ? ` (${cycleLength + 1 - state.mumeQuarterModeCount}/${cycleLength})`
        : ''
    const lossBuyPrice = round((avgPrice - 0.01) * ((100 - targetProfit) / 100))
    const lossBuyQty = Math.floor(unit / lossBuyPrice)
    const lossSellPrice = round(avgPrice * ((100 - targetProfit) / 100))

    buyOrders.push({
      title: `LOC -${formatNumber(targetProfit, 0)}%`,
      method: 'LOC',
      price: lossBuyPrice,
      quantity: lossBuyQty,
      amount: lossBuyPrice * lossBuyQty,
      note: `쿼터 손절${modeIndex}`,
    })
    buyOrders.push(...buildExtraBuyOrders(unit, lossBuyQty, lossBuyPrice, avgPrice))
    sellOrders.push({
      title: `LOC -${formatNumber(targetProfit, 0)}%`,
      method: 'LOC',
      price: lossSellPrice,
      quantity: quarterQty,
      amount: lossSellPrice * quarterQty,
      note: '보유수량 1/4 손절',
    })
    sellOrders.push({
      title: `LOC +${formatNumber(targetProfit, 0)}%`,
      method: 'LOC',
      price: targetSellPrice,
      quantity: restQty,
      amount: restQty * targetSellPrice,
      note: '잔량 목표가',
    })
  } else if (isFirstHalf) {
    const basePrice = avgPrice || currentPrice
    const baseQty = Math.floor(unit / basePrice)
    const starQty =
      version.id === 'v4'
        ? Math.floor((unit / 2) / starBuyPrice)
        : Math.floor((unit / 2) / starPrice)
    const avgQty =
      version.id === 'v4'
        ? Math.max(0, baseQty - starQty)
        : Math.max(0, Math.floor(unit / basePrice - starQty))

    buyOrders.push({
      title: '평균가 매수',
      method: 'LOC',
      price: basePrice,
      quantity: avgQty,
      amount: avgQty * basePrice,
      note: '평균 매수가 근처에서 매수',
    })
    buyOrders.push({
      title: '수익 기준 매수',
      method: 'LOC',
      price: starBuyPrice,
      quantity: starQty,
      amount: starQty * starBuyPrice,
      note: `${formatNumber(starPercent, 0)}% 수익 기준`,
    })
    buyOrders.push(
      ...buildExtraBuyOrders(
        unit,
        baseQty,
        version.id === 'v4' ? starBuyPrice : basePrice,
        basePrice,
        version.id === 'v4' ? 7 : 6,
        version.id !== 'v4',
      ),
    )
    sellOrders.push({
      title: '일부 매도',
      method: 'LOC',
      price: starPrice,
      quantity: quarterQty,
      amount: quarterQty * starPrice,
      note: '보유수량 1/4 매도',
    })
    sellOrders.push({
      title: '목표가 잔량',
      method: 'After 지정가',
      price: targetSellPrice,
      quantity: restQty,
      amount: restQty * targetSellPrice,
      note: `${formatNumber(targetProfit, 0)}% 목표`,
    })
  } else {
    const starQty = Math.floor(unit / starBuyPrice)

    buyOrders.push({
      title: '수익 기준 매수',
      method: 'LOC',
      price: starBuyPrice,
      quantity: starQty,
      amount: starQty * starBuyPrice,
      note: '후반전 단일 매수',
    })
    buyOrders.push(
      ...buildExtraBuyOrders(
        unit,
        starQty,
        starBuyPrice,
        avgPrice || currentPrice,
        version.id === 'v4' ? 7 : 6,
        version.id !== 'v4',
      ),
    )
    sellOrders.push({
      title: '일부 매도',
      method: 'LOC',
      price: starPrice,
      quantity: quarterQty,
      amount: quarterQty * starPrice,
      note: '보유수량 1/4 매도',
    })
    sellOrders.push({
      title: '목표가 잔량',
      method: 'After 지정가',
      price: targetSellPrice,
      quantity: restQty,
      amount: restQty * targetSellPrice,
      note: `${formatNumber(targetProfit, 0)}% 목표`,
    })
  }

  return {
    phase,
    unit,
    investedValue,
    remainingSeed,
    marketValue,
    pnl,
    pnlRate,
    tValue,
    starPercent,
    starPrice,
    targetSellPrice,
    progress,
    buyOrders,
    sellOrders,
  }
}

function buildVrGuide(state: AppState, position: Position, version: VrVersion): VrGuide {
  const currentPrice = positive(position.currentPrice) || getStock(state.selectedStockId).referencePrice
  const marketValue = positive(position.holdingQty) * currentPrice
  const poolStart = positive(state.vrStartPool) || positive(state.vrPool)
  const pool = positive(state.vrPool)
  const currentV = positive(state.vrCurrentV) || marketValue
  const targetValue = positive(currentV) || positive(state.seed)
  const band = clamp(positive(state.vrBandPercent), 1, 50) / 100
  const lowerValue = targetValue * (1 - band)
  const upperValue = targetValue * (1 + band)
  const poolAllowed = poolStart * (clamp(positive(state.vrPoolLimit), 0, 100) / 100)
  const poolUsed = Math.max(0, poolStart - pool)
  const poolUsedPercent = poolStart > 0 ? (poolUsed / poolStart) * 100 : 0
  const poolRemainingAllowed = Math.max(0, poolAllowed - poolUsed)
  const vNow = marketValue + pool
  const gradient = Math.max(1, positive(state.vrGradient))
  const regularAmount = positive(state.vrRegularAmount)
  const nextCycleBase =
    targetValue + pool / gradient + (marketValue - targetValue) / (2 * Math.sqrt(gradient))
  const nextCycleV = round(
    version.id === 'contribution'
      ? nextCycleBase + regularAmount
      : version.id === 'withdrawal'
        ? Math.max(0, nextCycleBase - regularAmount)
        : nextCycleBase,
  )
  const nextCyclePool =
    version.id === 'contribution'
      ? pool + regularAmount
      : version.id === 'withdrawal'
        ? Math.max(0, pool - regularAmount)
        : pool
  const cycleDue = isVrCycleDue(state)
  let status = '유지'
  let actionAmount = 0
  let actionQty = 0
  let poolAfter = pool
  let note = '밴드 안에 있으므로 주문 없음'

  if (cycleDue) {
    status = '갱신 필요'
    note = '사이클 종료일이 지났습니다'
  } else if (marketValue < lowerValue) {
    actionAmount = Math.min(targetValue - marketValue, poolRemainingAllowed, pool)
    actionQty = Math.floor(actionAmount / currentPrice)
    actionAmount = actionQty * currentPrice
    poolAfter = Math.max(0, pool - actionAmount)
    status = '매수'
    note = actionQty > 0 ? '현금 한도 안에서 목표 보유액으로 복귀' : '현금 한도 또는 단가 때문에 매수 불가'
  } else if (marketValue > upperValue) {
    actionAmount = marketValue - targetValue
    actionQty = Math.min(positive(position.holdingQty), Math.floor(actionAmount / currentPrice))
    actionAmount = actionQty * currentPrice
    poolAfter = pool + actionAmount
    status = version.id === 'withdrawal' ? '인출 매도' : '매도'
    note = version.id === 'withdrawal' ? '초과분을 현금 또는 인출금으로 회수' : '상단 범위 초과분 회수'
  }

  return {
    status,
    targetValue,
    lowerValue,
    upperValue,
    marketValue,
    actionAmount,
    actionQty,
    actionPrice: currentPrice,
    poolAfter,
    poolStart,
    poolUsed,
    poolUsedPercent,
    poolAllowed,
    poolRemainingAllowed,
    vNow,
    nextCycleV,
    nextCyclePool,
    note,
    cycleDue,
  }
}

function buildVrOrderBook(state: AppState, position: Position): VrOrderBook {
  const targetValue = positive(state.vrCurrentV)
  const hasStartQty = positive(state.vrStartQty) > 0
  const startPool = hasStartQty ? positive(state.vrStartPool) : positive(state.vrPool)
  const startQty = Math.floor(hasStartQty ? positive(state.vrStartQty) : positive(position.holdingQty))
  const orderUnit = clamp(Math.floor(positive(state.vrOrderUnit) || 1), 1, 100)
  const minV = targetValue > 0 ? targetValue * (1 - clamp(positive(state.vrBandPercent), 1, 50) / 100) : 0
  const maxV = targetValue > 0 ? targetValue * (1 + clamp(positive(state.vrBandPercent), 1, 50) / 100) : 0
  const availablePool = startPool * (clamp(positive(state.vrPoolLimit), 0, 100) / 100)
  const buyOrders: VrReservedOrder[] = []
  const sellOrders: VrReservedOrder[] = []

  if (targetValue <= 0 || startQty <= 0) {
    return { minV, maxV, buyOrders, sellOrders }
  }

  let buyPoolLimit = availablePool
  let buyPoolBalance = startPool
  let buyQty = startQty

  while (buyOrders.length < 2000 && buyQty > 0) {
    const price = minV / buyQty
    const amount = price * orderUnit

    if (buyPoolLimit < amount) {
      break
    }

    buyQty += orderUnit
    buyPoolLimit -= amount
    buyPoolBalance -= amount
    buyOrders.push({
      quantity: buyQty,
      price,
      poolBalance: buyPoolBalance,
    })
  }

  let sellPoolBalance = startPool
  let sellQty = startQty

  while (sellQty >= orderUnit) {
    const price = maxV / sellQty
    const amount = price * orderUnit

    sellQty -= orderUnit
    sellPoolBalance += amount
    sellOrders.push({
      quantity: sellQty,
      price,
      poolBalance: sellPoolBalance,
    })
  }

  return { minV, maxV, buyOrders, sellOrders }
}

function buildBasePositions(state: AppState): Record<string, Position> {
  return STOCKS.reduce<Record<string, Position>>((nextPositions, stock) => {
    STRATEGY_MODES.forEach((strategy) => {
      const currentPosition = getPosition(state, stock.id, strategy)

      nextPositions[getPositionKey(stock.id, strategy)] = createEmptyPosition(
        stock,
        currentPosition.currentPrice || stock.referencePrice,
      )
    })

    const stockSettings = getSettingsForStock(state, stock.id)
    const isVrStartPosition = positive(stockSettings.vrStartQty) > 0
    const startAvgPrice = positive(stockSettings.vrStartAvgPrice)
    const startQty = positive(stockSettings.vrStartQty)

    if (isVrStartPosition) {
      const currentVrPosition = getPosition(state, stock.id, 'vr')

      nextPositions[getPositionKey(stock.id, 'vr')] = {
        currentPrice: positive(currentVrPosition.currentPrice) || startAvgPrice || stock.referencePrice,
        avgPrice: startAvgPrice,
        holdingQty: startQty,
        totalBuy: startAvgPrice * startQty,
        totalSell: 0,
      }
    }

    return nextPositions
  }, {})
}

function rebuildStateFromTransactions(state: AppState, transactions: Transaction[]): AppState {
  const positions = buildBasePositions(state)
  const stockSettings = collectStockSettings(state)
  const nextStockSettings = STOCKS.reduce<Record<string, StockSettings>>((settings, stock) => {
    const currentSettings = stockSettings[stock.id] ?? getDefaultStockSettings()

    settings[stock.id] = {
      ...currentSettings,
      vrPool: currentSettings.vrStartPool,
      tValue: 0,
      mumeBuyingUnit: currentSettings.seed / Math.max(1, currentSettings.divisionDate),
      mumeQuarterMode: false,
      mumeQuarterModeCount: 0,
      mumeReverseMode: false,
      mumeReverseStarPrice: 0,
    }

    return settings
  }, {})
  const sortedTransactions = [...transactions].sort(
    (left, right) => new Date(left.at).getTime() - new Date(right.at).getTime(),
  )

  sortedTransactions.forEach((transaction) => {
    if (!isTransactionInActiveCycle(state, transaction)) {
      return
    }

    const settings = nextStockSettings[transaction.stockId] ?? getDefaultStockSettings()
    const positionKey = getPositionKey(transaction.stockId, transaction.strategy)
    const position =
      positions[positionKey] ??
      createEmptyPosition(getStock(transaction.stockId))
    const previousPosition = { ...position }
    const gross = transaction.price * transaction.quantity
    const fee = positive(transaction.fee)

    position.currentPrice = transaction.price

    if (transaction.type === 'buy') {
      const cost = gross + fee
      const nextQty = position.holdingQty + transaction.quantity

      position.avgPrice =
        nextQty > 0 ? round((position.avgPrice * position.holdingQty + cost) / nextQty) : 0
      position.holdingQty = nextQty
      position.totalBuy += cost

      if (transaction.strategy === 'vr') {
        settings.vrPool = Math.max(0, settings.vrPool - cost)
      }
    } else {
      const tradeQty = Math.min(position.holdingQty, transaction.quantity)
      const proceeds = Math.max(0, transaction.price * tradeQty - fee)

      position.holdingQty = Math.max(0, position.holdingQty - tradeQty)
      position.avgPrice = position.holdingQty > 0 ? position.avgPrice : 0
      position.totalSell += proceeds

      if (transaction.strategy === 'vr') {
        settings.vrPool += proceeds
      }
    }

    positions[positionKey] = position

    if (transaction.strategy === 'mume') {
      const version =
        MUME_VERSIONS.find((item) => item.id === settings.mumeVersionId) ?? MUME_VERSIONS[1]
      const divisionDate = Math.max(1, settings.divisionDate)

      if (version.id === 'v4') {
        if (transaction.type === 'buy') {
          const remainingBefore = Math.max(
            0,
            settings.seed - (previousPosition.totalBuy - previousPosition.totalSell),
          )
          const turnBefore = remainingBefore / Math.max(1, divisionDate - settings.tValue)
          const autoDelta =
            settings.mumeReverseMode
              ? (divisionDate - settings.tValue) * 0.25
              : 0.5 * Math.ceil(gross / Math.max(1, turnBefore / 2))

          settings.tValue += positive(transaction.tDelta ?? 0) || autoDelta
        } else if (settings.mumeReverseMode) {
          settings.tValue *= getReverseMultiplier(divisionDate)
          settings.mumeReverseStarPrice = positive(settings.mumeReverseStarPrice) || transaction.price
        } else {
          settings.tValue *= positive(transaction.tMultiplier ?? 0) || 0.75
        }

        settings.tValue = clamp(settings.tValue, 0, divisionDate)
        settings.mumeReverseMode = settings.mumeReverseMode || settings.tValue > divisionDate - 1
      } else if (transaction.type === 'buy') {
        const unitRef = version.id === 'v3' ? settings.mumeBuyingUnit : settings.seed / divisionDate
        const isNowQuarter = settings.seed - (position.totalBuy - position.totalSell) < unitRef

        if (settings.mumeQuarterMode && !isNowQuarter) {
          settings.mumeQuarterModeCount = version.id === 'v3' ? 5 : 10
        } else if (settings.mumeQuarterModeCount > 0) {
          settings.mumeQuarterModeCount -= 1
        } else {
          settings.mumeQuarterModeCount = 0
        }

        settings.mumeQuarterMode = isNowQuarter
      } else {
        const profit = (transaction.price - previousPosition.avgPrice) * transaction.quantity - fee
        const wasQuarterMode = settings.mumeQuarterMode

        if (version.id === 'v3' && profit > 0) {
          settings.mumeBuyingUnit += profit / (2 * divisionDate)
        }

        if (
          settings.mumeQuarterMode &&
          transaction.quantity >= previousPosition.holdingQty / 4
        ) {
          settings.mumeQuarterMode = false
        }

        settings.mumeQuarterModeCount =
          wasQuarterMode && !settings.mumeQuarterMode ? (version.id === 'v3' ? 5 : 10) : 0
      }
    }
  })

  return applySelectedStockSettings({
    ...state,
    positions,
    transactions,
  }, nextStockSettings)
}

function buildReportSummary(state: AppState): ReportSummary {
  const totals = STOCKS.reduce(
    (summary, stock) => {
      const position = getPosition(state, stock.id, state.strategyMode)
      const settings = getSettingsForStock(state, stock.id)
      const marketValue = position.holdingQty * position.currentPrice
      const pnl = marketValue + position.totalSell - position.totalBuy
      const seedBase =
        state.strategyMode === 'vr'
          ? positive(settings.vrCurrentV) || positive(settings.vrStartPool)
          : positive(settings.seed)

      summary.totalBuy += position.totalBuy
      summary.totalSell += position.totalSell
      summary.marketValue += marketValue
      summary.poolValue += state.strategyMode === 'vr' ? positive(settings.vrPool) : 0
      summary.seedBase += seedBase
      summary.pnlByStock.push({ name: stock.name, pnl })

      return summary
    },
    {
      totalBuy: 0,
      totalSell: 0,
      marketValue: 0,
      poolValue: 0,
      seedBase: 0,
      pnlByStock: [] as Array<{ name: string; pnl: number }>,
    },
  )
  const pnl = totals.marketValue + totals.totalSell - totals.totalBuy
  const bestStock =
    totals.pnlByStock
      .filter((item) => item.pnl !== 0)
      .sort((left, right) => right.pnl - left.pnl)[0]?.name ?? '-'

  return {
    totalBuy: totals.totalBuy,
    totalSell: totals.totalSell,
    marketValue: totals.marketValue,
    poolValue: totals.poolValue,
    pnl,
    profitRate: totals.totalBuy > 0 ? (pnl / totals.totalBuy) * 100 : 0,
    seedProfitRate: totals.seedBase > 0 ? (pnl / totals.seedBase) * 100 : 0,
    tradeCount: state.transactions.filter(
      (transaction) =>
        transaction.strategy === state.strategyMode && isTransactionInActiveCycle(state, transaction),
    ).length,
    bestStock,
  }
}

function getReportTransactions(
  state: AppState,
  stockId: string,
  strategy: StrategyMode,
): Transaction[] {
  return state.transactions.filter((transaction) => {
    if (transaction.stockId !== stockId || transaction.strategy !== strategy) {
      return false
    }

    if (strategy === 'mume') {
      return (transaction.cycleId ?? 'legacy') === getSettingsForStock(state, stockId).mumeCycleId
    }

    return transaction.date >= getSettingsForStock(state, stockId).vrStartDate
  })
}

function getOperationEndDate(
  state: AppState,
  stockId: string,
  strategy: StrategyMode,
): string {
  const lastTransactionDate = getReportTransactions(state, stockId, strategy)
    .map((transaction) => transaction.date)
    .sort()
    .at(-1)

  return [getTodayIso(), lastTransactionDate].filter(Boolean).sort().at(-1) ?? getTodayIso()
}

function buildCompletedReport(
  state: AppState,
  stockId: string,
  strategy: StrategyMode,
  endDate: string,
): CompletedReport {
  const position = getPosition(state, stockId, strategy)
  const settings = getSettingsForStock(state, stockId)
  const marketValue = position.holdingQty * position.currentPrice
  const pnl = marketValue + position.totalSell - position.totalBuy
  const reportTransactions = getReportTransactions(state, stockId, strategy)
  const firstTransaction = [...reportTransactions].sort(
    (left, right) => new Date(left.at).getTime() - new Date(right.at).getTime(),
  )[0]
  const seedBase =
    strategy === 'vr'
      ? positive(settings.vrCurrentV) || positive(settings.vrStartPool)
      : positive(settings.seed)

  return {
    id: createTransactionId(),
    strategy,
    stockId,
    version: strategy === 'vr' ? getVrVersion(settings.vrVersionId).label : settings.mumeVersionId,
    alias: settings.alias,
    tags: parseTags(settings.tags),
    startDate: strategy === 'vr' ? settings.vrStartDate : firstTransaction?.date ?? getTodayIso(),
    endDate,
    totalBuy: position.totalBuy,
    totalSell: position.totalSell,
    marketValue,
    pnl,
    profitRate: position.totalBuy > 0 ? (pnl / position.totalBuy) * 100 : 0,
    seedProfitRate: seedBase > 0 ? (pnl / seedBase) * 100 : 0,
    tradeCount: reportTransactions.length,
  }
}

function buildCompletedReportSummary(reports: CompletedReport[]): CompletedReportSummary {
  const count = reports.length
  const winners = reports.filter((report) => report.pnl > 0).length
  const totals = reports.reduce(
    (summary, report) => {
      summary.pnl += report.pnl
      summary.totalBuy += report.totalBuy
      summary.totalSell += report.totalSell

      return summary
    },
    {
      pnl: 0,
      totalBuy: 0,
      totalSell: 0,
    },
  )

  return {
    count,
    pnl: totals.pnl,
    totalBuy: totals.totalBuy,
    totalSell: totals.totalSell,
    winRate: count > 0 ? (winners / count) * 100 : 0,
  }
}

function App() {
  const [initialAppState] = useState(() => {
    const state = readStoredState()

    return {
      state,
      draft: createDraftForState(state),
    }
  })
  const [state, setState] = useState<AppState>(initialAppState.state)
  const [draft, setDraft] = useState<DraftTransaction>(initialAppState.draft)
  const [priceMessage, setPriceMessage] = useState('')
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)
  const [poolAdjustment, setPoolAdjustment] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [backupText, setBackupText] = useState('')
  const [dataMessage, setDataMessage] = useState('')
  const [reportStrategyFilter, setReportStrategyFilter] = useState<ReportStrategyFilter>('all')
  const [reportStockFilter, setReportStockFilter] = useState('all')
  const [reportTagFilter, setReportTagFilter] = useState('')
  const [reportStartDateFilter, setReportStartDateFilter] = useState('')
  const [reportEndDateFilter, setReportEndDateFilter] = useState('')

  const selectedStock = useMemo(() => getStock(state.selectedStockId), [state.selectedStockId])
  const selectedMumePosition = useMemo(
    () => getPosition(state, selectedStock.id, 'mume'),
    [selectedStock.id, state],
  )
  const selectedVrPosition = useMemo(
    () => getPosition(state, selectedStock.id, 'vr'),
    [selectedStock.id, state],
  )
  const selectedPosition = state.strategyMode === 'vr' ? selectedVrPosition : selectedMumePosition
  const selectedMumeVersion =
    MUME_VERSIONS.find((version) => version.id === state.mumeVersionId) ?? MUME_VERSIONS[1]
  const selectedVrVersion = getVrVersion(state.vrVersionId)
  const mumeGuide = useMemo(
    () => buildMumeGuide(state, selectedMumePosition, selectedMumeVersion),
    [selectedMumePosition, selectedMumeVersion, state],
  )
  const vrGuide = useMemo(
    () => buildVrGuide(state, selectedVrPosition, selectedVrVersion),
    [selectedVrPosition, selectedVrVersion, state],
  )
  const vrOrderBook = useMemo(
    () => buildVrOrderBook(state, selectedVrPosition),
    [selectedVrPosition, state],
  )
  const vrOrderBaseQty = positive(state.vrStartQty) || positive(selectedVrPosition.holdingQty)
  const selectedTransactions = useMemo(
    () =>
      state.transactions
        .filter(
          (transaction) =>
            transaction.stockId === selectedStock.id &&
            transaction.strategy === state.strategyMode &&
            isTransactionInActiveCycle(state, transaction),
        )
        .slice(0, 12),
    [selectedStock.id, state],
  )
  const report = useMemo(() => {
    const marketValue = selectedPosition.holdingQty * selectedPosition.currentPrice
    const pnl = marketValue + selectedPosition.totalSell - selectedPosition.totalBuy
    const pnlRate = selectedPosition.totalBuy > 0 ? (pnl / selectedPosition.totalBuy) * 100 : 0

    return {
      marketValue,
      pnl,
      pnlRate,
      totalAsset: state.strategyMode === 'vr' ? marketValue + state.vrPool : marketValue,
    }
  }, [selectedPosition, state.strategyMode, state.vrPool])
  const reportSummary = useMemo(() => buildReportSummary(state), [state])
  const reportTags = useMemo(
    () =>
      state.reports
        .flatMap((completedReport) => completedReport.tags)
        .filter((tag, index, tags) => tags.indexOf(tag) === index)
        .slice(0, 12),
    [state.reports],
  )
  const filteredReports = useMemo(
    () =>
      state.reports.filter((completedReport) => {
        if (reportStrategyFilter !== 'all' && completedReport.strategy !== reportStrategyFilter) {
          return false
        }

        if (reportStockFilter !== 'all' && completedReport.stockId !== reportStockFilter) {
          return false
        }

        if (reportTagFilter && !completedReport.tags.includes(reportTagFilter)) {
          return false
        }

        if (reportStartDateFilter && completedReport.endDate < reportStartDateFilter) {
          return false
        }

        if (reportEndDateFilter && completedReport.endDate > reportEndDateFilter) {
          return false
        }

        return true
      }),
    [
      reportEndDateFilter,
      reportStartDateFilter,
      reportStockFilter,
      reportStrategyFilter,
      reportTagFilter,
      state.reports,
    ],
  )
  const completedReportSummary = useMemo(
    () => buildCompletedReportSummary(filteredReports),
    [filteredReports],
  )
  const easyStrategyName = state.strategyMode === 'vr' ? '리밸런싱' : '분할매수'
  const easyActionTitle =
    state.strategyMode === 'vr'
      ? vrGuide.actionQty > 0
        ? `${vrGuide.status} ${formatNumber(vrGuide.actionQty, 0)}주`
        : vrGuide.cycleDue
          ? '다시 계산'
          : '쉬어가기'
      : mumeGuide.buyOrders.length + mumeGuide.sellOrders.length > 0
        ? `${mumeGuide.phase} · ${mumeGuide.buyOrders.length + mumeGuide.sellOrders.length}개`
        : '쉬어가기'
  const easyActionReason =
    state.strategyMode === 'vr'
      ? vrGuide.actionQty > 0
        ? vrGuide.status.includes('매도')
          ? '보유액이 기준보다 커서 일부를 현금으로 돌립니다'
          : '보유액이 기준보다 작아서 현금으로 채웁니다'
        : vrGuide.cycleDue
          ? '기간이 끝나 새 기준을 잡을 차례입니다'
          : '기준 범위 안이라 오늘은 주문하지 않습니다'
      : selectedMumePosition.holdingQty <= 0
        ? `${formatMoney(mumeGuide.unit)} 안에서 첫 진입합니다`
        : '평균단가와 목표가에 맞춰 매수·매도 주문을 둡니다'

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  function updateState<K extends keyof AppState>(field: K, value: AppState[K]) {
    setState((prevState) => ({
      ...(isStockSettingKey(field)
        ? applySettingsPatch(prevState, { [field]: value } as Partial<StockSettings>)
        : {
            ...prevState,
            [field]: value,
          }),
    }))
  }

  function selectOperation(stockId: string, strategyMode: StrategyMode) {
    const nextState = getOperationState(state, stockId, strategyMode)

    setState(nextState)
    setDraft((prevDraft) => createDraftForState(nextState, prevDraft))
  }

  function selectStrategyMode(strategyMode: StrategyMode) {
    selectOperation(state.selectedStockByStrategy[strategyMode] ?? state.selectedStockId, strategyMode)
  }

  function updateCurrentPrice(price: number) {
    setState((prevState) => {
      const stockId = prevState.selectedStockId
      const mumePosition = getPosition(prevState, stockId, 'mume')
      const vrPosition = getPosition(prevState, stockId, 'vr')

      return {
        ...prevState,
        positions: {
          ...prevState.positions,
          [getPositionKey(stockId, 'mume')]: {
            ...mumePosition,
            currentPrice: price,
          },
          [getPositionKey(stockId, 'vr')]: {
            ...vrPosition,
            currentPrice: price,
          },
        },
      }
    })
    setDraft((prevDraft) => ({
      ...prevDraft,
      price,
    }))
  }

  async function loadNaverCurrentPrice() {
    const realtimeUrl = `${NAVER_REALTIME_URL}?query=SERVICE_ITEM:${encodeURIComponent(selectedStock.ticker)}`
    const naverUrl = `${NAVER_STOCK_BASIC_URL}/${encodeURIComponent(selectedStock.ticker)}/basic`

    setIsLoadingPrice(true)
    setPriceMessage('네이버 현재가 확인 중')

    try {
      let price = 0
      let priceTime = ''

      try {
        const realtime = await fetchReaderJson<NaverRealtimeResponse>(realtimeUrl)
        const realtimePrice = realtime.result?.areas?.[0]?.datas?.[0]?.nv
        price = typeof realtimePrice === 'number' ? realtimePrice : parseLocaleNumber(String(realtimePrice ?? ''))
      } catch {
        const basic = await fetchReaderJson<NaverStockBasicResponse>(naverUrl)
        price = basic.closePrice ? parseLocaleNumber(basic.closePrice) : 0
        priceTime = formatNaverPriceTime(basic.localTradedAt)
      }

      if (!price) {
        throw new Error('Price missing')
      }

      updateCurrentPrice(price)

      setPriceMessage(priceTime ? `${priceTime} 네이버 기준` : '네이버 현재가 반영')
    } catch {
      setPriceMessage('현재가를 불러오지 못했습니다')
    } finally {
      setIsLoadingPrice(false)
    }
  }

  function updateEasyPosition(field: 'avgPrice' | 'holdingQty', value: number) {
    setState((prevState) => {
      const currentPosition = getPosition(prevState, prevState.selectedStockId, prevState.strategyMode)
      const positionKey = getPositionKey(prevState.selectedStockId, prevState.strategyMode)
      const nextPosition = {
        ...currentPosition,
        [field]: value,
      }
      const impliedBuy = positive(nextPosition.avgPrice) * positive(nextPosition.holdingQty)

      if (!positive(nextPosition.totalBuy) && impliedBuy > 0) {
        nextPosition.totalBuy = round(impliedBuy)
      }

      return {
        ...prevState,
        positions: {
          ...prevState.positions,
          [positionKey]: nextPosition,
        },
      }
    })
  }

  function updateVrStart<K extends 'vrStartAvgPrice' | 'vrStartQty'>(field: K, value: AppState[K]) {
    setState((prevState) => {
      const nextAvgPrice =
        field === 'vrStartAvgPrice' ? Number(value) : prevState.vrStartAvgPrice
      const nextQty = field === 'vrStartQty' ? Number(value) : prevState.vrStartQty
      const nextState = {
        ...prevState,
        [field]: value,
        ...(prevState.vrStartMode === 'new'
          ? { vrCurrentV: getAutoVrStartValue(nextAvgPrice, nextQty) }
          : {}),
      }

      return rebuildStateFromTransactions(syncCurrentStockSettings(nextState), nextState.transactions)
    })
  }

  function selectVrStartMode(mode: VrStartMode) {
    setState((prevState) => {
      const currentVrPosition = getPosition(prevState, prevState.selectedStockId, 'vr')
      const selected = getStock(prevState.selectedStockId)
      const nextState: AppState =
        mode === 'new'
          ? {
              ...prevState,
              vrStartMode: 'new',
              vrCurrentV: 0,
              vrStartAvgPrice: 0,
              vrStartQty: 0,
            }
          : {
              ...prevState,
              vrStartMode: 'running',
              vrStartAvgPrice:
                positive(prevState.vrStartAvgPrice) ||
                positive(currentVrPosition.avgPrice) ||
                positive(currentVrPosition.currentPrice) ||
                selected.referencePrice,
              vrStartQty: positive(prevState.vrStartQty) || positive(currentVrPosition.holdingQty),
            }

      return rebuildStateFromTransactions(syncCurrentStockSettings(nextState), nextState.transactions)
    })
  }

  function updateVrCycleStartDate(selectedStartDate: string) {
    const nextStartDate = getMondayOnOrAfterIso(selectedStartDate)

    setSettingsMessage(
      selectedStartDate === nextStartDate
        ? ''
        : `시작일을 ${nextStartDate}로 보정했습니다.`,
    )
    setState((prevState) => applySettingsPatch(prevState, {
      vrStartDate: nextStartDate,
      vrEndDate: getCycleEndDate(nextStartDate),
    }))
  }

  function selectStock(stockId: string) {
    selectOperation(stockId, state.strategyMode)
  }

  function selectMumeVersion(versionId: MumeVersion['id']) {
    const nextVersion = MUME_VERSIONS.find((version) => version.id === versionId) ?? MUME_VERSIONS[1]

    setState((prevState) =>
      applySettingsPatch(prevState, {
        mumeVersionId: nextVersion.id,
        divisionDate: nextVersion.defaultDivision,
        targetProfit:
          nextVersion.id === 'v4'
            ? getV4TargetProfit(getStock(prevState.selectedStockId))
            : nextVersion.defaultTargetProfit,
        mumeBuyingUnit: prevState.seed / nextVersion.defaultDivision,
        mumeQuarterMode: false,
        mumeQuarterModeCount: 0,
        mumeReverseMode: false,
        mumeReverseStarPrice: 0,
        mumeCycleId: createTransactionId(),
        tValue: 0,
      }),
    )
  }

  function updateMumeSeed(seed: number) {
    setState((prevState) => {
      const divisionDate = Math.max(1, positive(prevState.divisionDate) || 1)

      return applySettingsPatch(prevState, {
        seed,
        mumeBuyingUnit:
          prevState.mumeVersionId === 'v3'
            ? seed / divisionDate
            : prevState.mumeBuyingUnit,
      })
    })
  }

  function updateMumeDivisionDate(divisionDate: number) {
    setState((prevState) => {
      const nextDivisionDate = Math.max(1, divisionDate)

      return applySettingsPatch(prevState, {
        divisionDate: nextDivisionDate,
        mumeBuyingUnit:
          prevState.mumeVersionId === 'v3'
            ? prevState.seed / nextDivisionDate
            : prevState.mumeBuyingUnit,
      })
    })
  }

  function selectVrVersion(versionId: VrVersion['id']) {
    const nextVersion = getVrVersion(versionId)

    setState((prevState) => applySettingsPatch(prevState, {
      vrVersionId: nextVersion.id,
      ...getVrVersionDefaults(nextVersion.id),
    }))
  }

  function applyTransaction() {
    const price = positive(draft.price)
    const quantity = positive(draft.quantity)

    if (!price || !quantity) {
      return
    }

    const tradeDate = getStrategyTradeDate(state, draft.date || getTodayIso())

    setState((prevState) => {
      const position = getPosition(prevState, prevState.selectedStockId, prevState.strategyMode)
      const positionKey = getPositionKey(prevState.selectedStockId, prevState.strategyMode)
      const tradeQty =
        draft.type === 'sell' ? Math.min(position.holdingQty, quantity) : quantity

      if (tradeQty <= 0) {
        return prevState
      }

      const gross = tradeQty * price
      const fee =
        positive(draft.fee) ||
        (prevState.strategyMode === 'mume'
          ? round(gross * (positive(prevState.commissionRate) / 100), 3)
          : 0)
      const nextPosition = { ...position, currentPrice: price }
      let nextPool = prevState.vrPool
      let nextTValue = prevState.tValue
      let nextBuyingUnit =
        positive(prevState.mumeBuyingUnit) || prevState.seed / Math.max(1, prevState.divisionDate)
      let nextQuarterMode = prevState.mumeQuarterMode
      let nextQuarterModeCount = prevState.mumeQuarterModeCount
      let nextReverseMode = prevState.mumeReverseMode
      let nextReverseStarPrice = prevState.mumeReverseStarPrice

      if (draft.type === 'buy') {
        const cost = gross + fee
        const nextQty = position.holdingQty + tradeQty
        nextPosition.avgPrice =
          nextQty > 0 ? round((position.avgPrice * position.holdingQty + cost) / nextQty) : 0
        nextPosition.holdingQty = nextQty
        nextPosition.totalBuy = position.totalBuy + cost

        if (prevState.strategyMode === 'vr') {
          nextPool = Math.max(0, nextPool - cost)
        }
      } else {
        const proceeds = Math.max(0, gross - fee)
        nextPosition.holdingQty = Math.max(0, position.holdingQty - tradeQty)
        nextPosition.avgPrice = nextPosition.holdingQty > 0 ? position.avgPrice : 0
        nextPosition.totalSell = position.totalSell + proceeds

        if (prevState.strategyMode === 'vr') {
          nextPool += proceeds
        }
      }

      if (prevState.strategyMode === 'mume') {
        const version = MUME_VERSIONS.find((item) => item.id === prevState.mumeVersionId) ?? MUME_VERSIONS[1]
        const divisionDate = Math.max(1, prevState.divisionDate)

        if (version.id === 'v4') {
          if (draft.type === 'buy') {
            const remainingBefore = Math.max(0, prevState.seed - (position.totalBuy - position.totalSell))
            const turnBefore = remainingBefore / Math.max(1, divisionDate - nextTValue)
            const autoDelta =
              nextReverseMode
                ? (divisionDate - nextTValue) * 0.25
                : 0.5 * Math.ceil(gross / Math.max(1, turnBefore / 2))

            nextTValue += positive(draft.tDelta) || autoDelta
          } else if (nextReverseMode) {
            nextTValue *= getReverseMultiplier(divisionDate)
            nextReverseStarPrice = positive(nextReverseStarPrice) || price
          } else {
            const autoMultiplier = tradeQty > position.holdingQty / 2 ? 0.25 : 0.75
            nextTValue *= positive(draft.tMultiplier) || autoMultiplier
          }

          nextTValue = clamp(nextTValue, 0, divisionDate)
          nextReverseMode = nextReverseMode || nextTValue > divisionDate - 1
        } else if (draft.type === 'buy') {
          const unitRef = version.id === 'v3' ? nextBuyingUnit : prevState.seed / divisionDate
          const nextInvested = nextPosition.totalBuy - nextPosition.totalSell
          const isNowQuarter = prevState.seed - nextInvested < unitRef

          if (nextQuarterMode && !isNowQuarter) {
            nextQuarterModeCount = version.id === 'v3' ? 5 : 10
          } else if (nextQuarterModeCount > 0) {
            nextQuarterModeCount -= 1
          } else {
            nextQuarterModeCount = 0
          }

          nextQuarterMode = isNowQuarter
        } else {
          const profit = (price - position.avgPrice) * tradeQty - fee
          const wasQuarterMode = nextQuarterMode

          if (version.id === 'v3' && profit > 0) {
            nextBuyingUnit += profit / (2 * divisionDate)
          }

          if (nextQuarterMode && tradeQty >= position.holdingQty / 4) {
            nextQuarterMode = false
          }

          nextQuarterModeCount = wasQuarterMode && !nextQuarterMode ? (version.id === 'v3' ? 5 : 10) : 0
        }
      }

      const transaction: Transaction = {
        id: createTransactionId(),
        at: new Date(`${tradeDate}T12:00:00`).toISOString(),
        date: tradeDate,
        stockId: prevState.selectedStockId,
        strategy: prevState.strategyMode,
        type: draft.type,
        price,
        quantity: tradeQty,
        fee,
        memo: draft.memo,
        ...(prevState.strategyMode === 'mume' ? { cycleId: prevState.mumeCycleId } : {}),
        ...(prevState.strategyMode === 'mume' && prevState.mumeVersionId === 'v4' && draft.type === 'buy'
          ? { tDelta: positive(draft.tDelta) || undefined }
          : {}),
        ...(prevState.strategyMode === 'mume' && prevState.mumeVersionId === 'v4' && draft.type === 'sell'
          ? { tMultiplier: positive(draft.tMultiplier) || undefined }
          : {}),
      }
      const nextTransactions = [transaction, ...prevState.transactions].slice(0, 80)
      const nextState: AppState = syncCurrentStockSettings({
        ...prevState,
        vrPool: nextPool,
        vrCurrentV: prevState.vrCurrentV,
        tValue: nextTValue,
        mumeBuyingUnit: nextBuyingUnit,
        mumeQuarterMode: nextQuarterMode,
        mumeQuarterModeCount: nextQuarterModeCount,
        mumeReverseMode: nextReverseMode,
        mumeReverseStarPrice: nextReverseStarPrice,
        positions: {
          ...prevState.positions,
          [positionKey]: nextPosition,
        },
        transactions: nextTransactions,
      })
      const completedMumeCycle =
        prevState.strategyMode === 'mume' &&
        draft.type === 'sell' &&
        position.holdingQty > 0 &&
        nextPosition.holdingQty === 0

      if (!completedMumeCycle) {
        return nextState
      }

      return {
        ...syncCurrentStockSettings({
          ...nextState,
          tValue: 0,
          mumeBuyingUnit:
            nextState.seed / Math.max(1, nextState.divisionDate),
          mumeQuarterMode: false,
          mumeQuarterModeCount: 0,
          mumeReverseMode: false,
          mumeReverseStarPrice: 0,
          mumeCycleId: createTransactionId(),
          positions: {
            ...nextState.positions,
            [positionKey]: {
              currentPrice: price,
              avgPrice: 0,
              holdingQty: 0,
              totalBuy: 0,
              totalSell: 0,
            },
          },
        }),
        reports: [
          buildCompletedReport(nextState, prevState.selectedStockId, 'mume', transaction.date),
          ...prevState.reports,
        ].slice(0, 80),
      }
    })
    setDraft((prevDraft) => ({
      ...prevDraft,
      date: getStrategyTradeDate(state),
      quantity: 1,
      fee: 0,
      memo: '',
      tDelta: 0,
      tMultiplier: 0.75,
    }))
  }

  function deleteTransaction(transactionId: string) {
    if (!window.confirm('거래 내역을 삭제할까요?')) {
      return
    }

    setState((prevState) => {
      const nextTransactions = prevState.transactions.filter(
        (transaction) => transaction.id !== transactionId,
      )

      return rebuildStateFromTransactions(prevState, nextTransactions)
    })
  }

  function recalculateTransactions() {
    setState((prevState) => rebuildStateFromTransactions(prevState, prevState.transactions))
  }

  function deleteCompletedReport(reportId: string) {
    if (!window.confirm('완료 기록을 삭제할까요?')) {
      return
    }

    setState((prevState) => ({
      ...prevState,
      reports: prevState.reports.filter((report) => report.id !== reportId),
    }))
  }

  function clearReportFilters() {
    setReportStrategyFilter('all')
    setReportStockFilter('all')
    setReportTagFilter('')
    setReportStartDateFilter('')
    setReportEndDateFilter('')
  }

  function deleteFilteredReports() {
    const reportIds = new Set(filteredReports.map((completedReport) => completedReport.id))

    if (reportIds.size === 0) {
      return
    }

    if (!window.confirm(`완료 기록 ${reportIds.size}건을 삭제할까요?`)) {
      return
    }

    setState((prevState) => ({
      ...prevState,
      reports: prevState.reports.filter((report) => !reportIds.has(report.id)),
    }))
    setReportTagFilter('')
  }

  function completeCurrentOperation() {
    const strategy = state.strategyMode
    const stockId = state.selectedStockId
    const position = getPosition(state, stockId, strategy)
    const hasActivity =
      position.holdingQty > 0 ||
      position.totalBuy > 0 ||
      position.totalSell > 0 ||
      getReportTransactions(state, stockId, strategy).length > 0

    if (!hasActivity) {
      setDataMessage('종료할 운용 없음')
      return
    }

    if (!window.confirm('현재 평가 기준으로 운용을 종료하고 리포트로 넘길까요?')) {
      return
    }

    setState((prevState) => {
      const currentStrategy = prevState.strategyMode
      const currentStockId = prevState.selectedStockId
      const currentStock = getStock(currentStockId)
      const currentPosition = getPosition(prevState, currentStockId, currentStrategy)
      const positionKey = getPositionKey(currentStockId, currentStrategy)
      const currentPrice = positive(currentPosition.currentPrice) || currentStock.referencePrice
      const operationEndDate = getOperationEndDate(prevState, currentStockId, currentStrategy)
      const completedReport = buildCompletedReport(
        prevState,
        currentStockId,
        currentStrategy,
        operationEndDate,
      )
      const basePosition = createEmptyPosition(currentStock, currentPrice)

      if (currentStrategy === 'mume') {
        return {
          ...syncCurrentStockSettings({
            ...prevState,
            tValue: 0,
            mumeBuyingUnit: prevState.seed / Math.max(1, prevState.divisionDate),
            mumeQuarterMode: false,
            mumeQuarterModeCount: 0,
            mumeReverseMode: false,
            mumeReverseStarPrice: 0,
            mumeCycleId: createTransactionId(),
            positions: {
              ...prevState.positions,
              [positionKey]: basePosition,
            },
          }),
          reports: [completedReport, ...prevState.reports].slice(0, 80),
        }
      }

      const marketValue = currentPosition.holdingQty * currentPrice
      const nextPool = positive(prevState.vrPool) + marketValue
      const nextStartDate = getMondayAfterIso(operationEndDate)

      return syncCurrentStockSettings({
        ...prevState,
        reports: [completedReport, ...prevState.reports].slice(0, 80),
        vrStartAvgPrice: 0,
        vrStartQty: 0,
        vrStartPool: nextPool,
        vrPool: nextPool,
        vrStartDate: nextStartDate,
        vrEndDate: getCycleEndDate(nextStartDate),
        positions: {
          ...prevState.positions,
          [positionKey]: basePosition,
        },
      })
    })
    setDataMessage('운용 종료')
  }

  function resetAll() {
    if (!window.confirm('모든 로컬 데이터를 초기화할까요?')) {
      return
    }

    window.localStorage.removeItem(STORAGE_KEY)
    const nextState = syncCurrentStockSettings(DEFAULT_STATE)

    setState(nextState)
    setDraft(createDraftForState(nextState))
    setPoolAdjustment('')
    setSettingsMessage('')
    setBackupText('')
    setDataMessage('')
    clearReportFilters()
  }

  function exportData() {
    const payload = JSON.stringify(
      {
        app: 'vakde-gate',
        version: 10,
        exportedAt: new Date().toISOString(),
        state,
      },
      null,
      2,
    )

    setBackupText(payload)
    setDataMessage('백업 생성')

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(payload)
        .then(() => setDataMessage('백업 복사 완료'))
        .catch(() => undefined)
    }
  }

  function importData() {
    try {
      const parsed = JSON.parse(backupText) as unknown

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid data')
      }

      const record = parsed as Record<string, unknown>
      const candidate =
        record.state && typeof record.state === 'object'
          ? (record.state as Partial<AppState>)
          : (parsed as Partial<AppState>)

      setState(normalizeStoredState(candidate))
      setDataMessage('복원 완료')
    } catch {
      setDataMessage('JSON 확인 필요')
    }
  }

  function updateVrPool(mode: 'increase' | 'decrease' | 'direct') {
    const amount = positive(Number(poolAdjustment))

    if (!amount && mode !== 'direct') {
      return
    }

    setState((prevState) => {
      const nextPool =
        mode === 'increase'
          ? prevState.vrPool + amount
          : mode === 'decrease'
            ? Math.max(0, prevState.vrPool - amount)
            : Math.max(0, amount)

      return applySettingsPatch(prevState, {
        vrPool: nextPool,
      })
    })
    setPoolAdjustment('')
  }

  function renewVrCycle() {
    if (!window.confirm('다음 리밸런싱 기간으로 갱신할까요?')) {
      return
    }

    setState((prevState) => {
      const cyclePosition = getPosition(prevState, prevState.selectedStockId, 'vr')
      const cycleGuide = buildVrGuide(prevState, cyclePosition, getVrVersion(prevState.vrVersionId))
      const operationEndDate = getOperationEndDate(prevState, prevState.selectedStockId, 'vr')
      const nextStartDate = getNextMondayIso()
      const hasVrActivity =
        cyclePosition.holdingQty > 0 ||
        cyclePosition.totalBuy > 0 ||
        prevState.transactions.some(
          (transaction) =>
            transaction.stockId === prevState.selectedStockId &&
            transaction.strategy === 'vr' &&
            transaction.date >= prevState.vrStartDate,
        )
      const cycleReport = hasVrActivity
        ? buildCompletedReport(prevState, prevState.selectedStockId, 'vr', operationEndDate)
        : null

      return syncCurrentStockSettings({
        ...prevState,
        reports: cycleReport ? [cycleReport, ...prevState.reports].slice(0, 80) : prevState.reports,
        vrCurrentV: cycleGuide.nextCycleV,
        vrStartAvgPrice: cyclePosition.avgPrice,
        vrStartQty: cyclePosition.holdingQty,
        vrStartPool: cycleGuide.nextCyclePool,
        vrPool: cycleGuide.nextCyclePool,
        vrStartDate: nextStartDate,
        vrEndDate: getCycleEndDate(nextStartDate),
      })
    })
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">VG</span>
          <div>
            <h1>오늘 주문 계산기</h1>
            <p>
              Vakde Gate · {state.alias ? `${state.alias} · ` : ''}{selectedStock.ticker} ·{' '}
              {getStrategyLabel(state.strategyMode)}
            </p>
          </div>
        </div>
        <button className="ghost-button" type="button" onClick={resetAll}>
          초기화
        </button>
      </header>

      <section className="strategy-strip" aria-label="운용 방식">
        <button
          aria-selected={state.strategyMode === 'vr'}
          className={state.strategyMode === 'vr' ? 'strategy-card is-active' : 'strategy-card'}
          type="button"
          onClick={() => selectStrategyMode('vr')}
        >
          <strong>리밸런싱</strong>
        </button>
        <button
          aria-selected={state.strategyMode === 'mume'}
          className={state.strategyMode === 'mume' ? 'strategy-card is-active' : 'strategy-card'}
          type="button"
          onClick={() => selectStrategyMode('mume')}
        >
          <strong>분할매수</strong>
        </button>
      </section>

      <section className="control-strip" aria-label="종목과 가격">
        <label className="field stock-field">
          <span>종목</span>
          <select value={state.selectedStockId} onChange={(event) => selectStock(event.target.value)}>
            {STOCKS.map((stock) => {
              const settings = getSettingsForStock(state, stock.id)

              return (
                <option key={stock.id} value={stock.id}>
                  {settings.alias ? `${settings.alias} · ${stock.name}` : stock.name}
                </option>
              )
            })}
          </select>
        </label>

        <div className="field price-field">
          <span>현재가</span>
          <div className="price-input-row">
            <NumberInput
              inputMode="numeric"
              min="0"
              type="number"
              value={selectedPosition.currentPrice}
              onChange={(event) => updateCurrentPrice(Number(event.target.value))}
            />
            <button className="ghost-button" disabled={isLoadingPrice} type="button" onClick={loadNaverCurrentPrice}>
              {isLoadingPrice ? '확인 중' : '현재가 받기'}
            </button>
          </div>
          {priceMessage ? <small className="field-message">{priceMessage}</small> : null}
        </div>
      </section>

      <section className="summary-bar" aria-label="요약">
        <div>
          <span>평균 매수가</span>
          <strong>{formatMoney(selectedPosition.avgPrice)}</strong>
        </div>
        <div>
          <span>보유</span>
          <strong>{formatNumber(selectedPosition.holdingQty, 0)}주</strong>
        </div>
        <div>
          <span>평가금</span>
          <strong>{formatMoney(report.marketValue)}</strong>
        </div>
        <div>
          <span>손익</span>
          <strong className={report.pnl >= 0 ? 'up' : 'down'}>{formatMoney(report.pnl)}</strong>
        </div>
      </section>

      <section
        className={state.strategyMode === 'vr' ? 'focus-board is-compact' : 'focus-board is-orderbook'}
        aria-label="오늘 운용"
      >
        <div className="focus-status">
          <span>{easyStrategyName}</span>
          <strong>{easyActionTitle}</strong>
          <p>{easyActionReason}</p>
        </div>

        <div className="focus-order">
          {state.strategyMode === 'vr' ? (
            <>
              <div className="focus-order-title">
                <span>오늘 주문</span>
                <strong>
                  {vrGuide.actionQty > 0
                    ? `${vrGuide.status} ${formatNumber(vrGuide.actionQty, 0)}주`
                    : '주문 없음'}
                </strong>
              </div>
              <div className="focus-order-metrics">
                <div>
                  <span>기준가</span>
                  <strong>{formatMoney(vrGuide.actionPrice)}</strong>
                </div>
                <div>
                  <span>금액</span>
                  <strong>{formatMoney(vrGuide.actionAmount)}</strong>
                </div>
                <div>
                  <span>남은 현금</span>
                  <strong>{formatMoney(vrGuide.poolAfter)}</strong>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="focus-order-title">
                <span>오늘 걸어둘 주문</span>
                <strong>{mumeGuide.buyOrders.length + mumeGuide.sellOrders.length}개</strong>
              </div>
              <div className="mume-order-columns">
                <CompactOrderList emptyText="매수 없음" orders={mumeGuide.buyOrders} title="매수" />
                <CompactOrderList emptyText="매도 없음" orders={mumeGuide.sellOrders} title="매도" />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="panel quick-trade-panel" aria-label="체결 기록">
        <div className="panel-heading">
          <h2>체결했으면 기록</h2>
        </div>

        <div className="quick-trade-grid">
          <div className="segmented full">
            <button
              className={draft.type === 'buy' ? 'is-active' : ''}
              type="button"
              onClick={() => setDraft((prevDraft) => ({ ...prevDraft, type: 'buy' }))}
            >
              매수
            </button>
            <button
              className={draft.type === 'sell' ? 'is-active' : ''}
              type="button"
              onClick={() => setDraft((prevDraft) => ({ ...prevDraft, type: 'sell' }))}
            >
              매도
            </button>
          </div>

          <label className="field">
            <span>날짜</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) =>
                setDraft((prevDraft) => ({ ...prevDraft, date: event.target.value }))
              }
              onInput={(event) =>
                setDraft((prevDraft) => ({ ...prevDraft, date: event.currentTarget.value }))
              }
            />
          </label>
          <label className="field">
            <span>가격</span>
            <NumberInput
              inputMode="numeric"
              min="0"
              type="number"
              value={draft.price}
              onChange={(event) =>
                setDraft((prevDraft) => ({ ...prevDraft, price: Number(event.target.value) }))
              }
            />
          </label>
          <label className="field">
            <span>수량</span>
            <NumberInput
              inputMode="decimal"
              min="0"
              step="1"
              type="number"
              value={draft.quantity}
              onChange={(event) =>
                setDraft((prevDraft) => ({ ...prevDraft, quantity: Number(event.target.value) }))
              }
            />
          </label>
          <button className="primary-button" type="button" onClick={applyTransaction}>
            기록하기
          </button>
        </div>

      </section>

      <details className="advanced-workspace">
        <summary className="advanced-workspace-summary">
          <span>세부 설정</span>
          <small>버전, 리포트, 백업</small>
        </summary>

      <div className="workspace-grid">
        <details className="panel settings-panel advanced-panel">
          <summary className="panel-summary">
            <span>{state.strategyMode === 'mume' ? '무한매수 설정' : '리밸런싱 설정'}</span>
            <small>버전, 예산, 현금, 고급값</small>
          </summary>
          <div className="panel-body">

          <div className="form-grid meta-grid">
            <label className="field">
              <span>별명</span>
              <input
                value={state.alias}
                onChange={(event) => updateState('alias', event.target.value)}
                placeholder={selectedStock.name}
              />
            </label>
            <label className="field">
              <span>태그</span>
              <input
                value={state.tags}
                onChange={(event) => updateState('tags', event.target.value)}
                placeholder="예: 단기, 월급"
              />
            </label>
          </div>

          {state.strategyMode === 'mume' ? (
            <>
              <div className="button-grid">
                {MUME_VERSIONS.map((version) => (
                  <button
                    key={version.id}
                    aria-label={version.label}
                    className={state.mumeVersionId === version.id ? 'option is-active' : 'option'}
                    type="button"
                    onClick={() => selectMumeVersion(version.id)}
                  >
                    <strong>{version.label}</strong>
                  </button>
                ))}
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>전체 예산</span>
                  <NumberInput
                    inputMode="numeric"
                    min="0"
                    type="number"
                    value={state.seed}
                    onChange={(event) => updateMumeSeed(Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>평균 매수가</span>
                  <NumberInput
                    inputMode="numeric"
                    min="0"
                    type="number"
                    value={selectedMumePosition.avgPrice}
                    onChange={(event) => updateEasyPosition('avgPrice', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>보유 수량</span>
                  <NumberInput
                    inputMode="decimal"
                    min="0"
                    step="1"
                    type="number"
                    value={selectedMumePosition.holdingQty}
                    onChange={(event) => updateEasyPosition('holdingQty', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>분할 일수</span>
                  <NumberInput
                    inputMode="numeric"
                    min="1"
                    type="number"
                    value={state.divisionDate}
                    onChange={(event) => updateMumeDivisionDate(Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>목표 수익률 %</span>
                  <NumberInput
                    readOnly={state.mumeVersionId === 'v4'}
                    className={state.mumeVersionId === 'v4' ? 'is-readonly' : ''}
                    inputMode="decimal"
                    min="0"
                    step="1"
                    type="number"
                    value={
                      state.mumeVersionId === 'v4'
                        ? getV4TargetProfit(selectedStock)
                        : state.targetProfit
                    }
                    onChange={(event) => updateState('targetProfit', Number(event.target.value))}
                  />
                </label>
                {state.mumeVersionId === 'v4' ? (
                  <label className="field">
                    <span>T값</span>
                    <NumberInput
                      inputMode="decimal"
                      min="0"
                      step="1"
                      type="number"
                      value={Math.round(state.tValue)}
                      onChange={(event) => updateState('tValue', Number(event.target.value))}
                    />
                  </label>
                ) : null}
                {state.mumeVersionId === 'v3' ? (
                  <label className="field">
                    <span>1회차</span>
                    <NumberInput
                      inputMode="numeric"
                      min="0"
                      type="number"
                      value={state.mumeBuyingUnit}
                      onChange={(event) => updateState('mumeBuyingUnit', Number(event.target.value))}
                    />
                  </label>
                ) : null}
                <label className="field">
                  <span>수수료율 %</span>
                  <NumberInput
                    inputMode="numeric"
                    min="0"
                    step="1"
                    type="number"
                    value={Math.round(state.commissionRate)}
                    onChange={(event) => updateState('commissionRate', Number(event.target.value))}
                  />
                </label>
              </div>

              {state.mumeVersionId !== 'v4' ? (
                <div className="mode-row">
                  <label className="check-line">
                    <input
                      checked={state.mumeQuarterMode}
                      type="checkbox"
                      onChange={(event) => updateState('mumeQuarterMode', event.target.checked)}
                    />
                    <span>쿼터 모드</span>
                  </label>
                  <label className="field compact-field">
                    <span>쿼터 카운트</span>
                    <NumberInput
                      inputMode="numeric"
                      min="0"
                      type="number"
                      value={state.mumeQuarterModeCount}
                      onChange={(event) => updateState('mumeQuarterModeCount', Number(event.target.value))}
                    />
                  </label>
                </div>
              ) : (
                <div className="mode-row">
                  <label className="check-line">
                    <input
                      checked={state.mumeReverseMode}
                      type="checkbox"
                      onChange={(event) => updateState('mumeReverseMode', event.target.checked)}
                    />
                    <span>리버스 모드</span>
                  </label>
                  <label className="field compact-field">
                    <span>리버스 기준가</span>
                    <NumberInput
                      inputMode="decimal"
                      min="0"
                      type="number"
                      value={state.mumeReverseStarPrice}
                      onChange={(event) => updateState('mumeReverseStarPrice', Number(event.target.value))}
                    />
                  </label>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="button-grid">
                {VR_VERSIONS.map((version) => (
                  <button
                    key={version.id}
                    aria-label={version.label}
                    className={state.vrVersionId === version.id ? 'option is-active' : 'option'}
                    type="button"
                    onClick={() => selectVrVersion(version.id)}
                  >
                    <strong>{version.label}</strong>
                  </button>
                ))}
              </div>

              <div className="vr-start-mode">
                <span>운영 시작</span>
                <div className="segmented compact">
                  <button
                    className={state.vrStartMode === 'new' ? 'is-active' : ''}
                    type="button"
                    onClick={() => selectVrStartMode('new')}
                  >
                    신규
                  </button>
                  <button
                    className={state.vrStartMode === 'running' ? 'is-active' : ''}
                    type="button"
                    onClick={() => selectVrStartMode('running')}
                  >
                    운용 중
                  </button>
                </div>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>{state.vrStartMode === 'new' ? '시작 기준 자동값' : '기준 자산'}</span>
                  <NumberInput
                    inputMode="numeric"
                    min="0"
                    readOnly={state.vrStartMode === 'new'}
                    type="number"
                    value={
                      state.vrStartMode === 'new'
                        ? getAutoVrStartValue(state.vrStartAvgPrice, state.vrStartQty)
                        : state.vrCurrentV
                    }
                    onChange={(event) => updateState('vrCurrentV', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>반응 속도</span>
                  <NumberInput
                    inputMode="numeric"
                    min="1"
                    step="1"
                    type="number"
                    value={state.vrGradient}
                    onChange={(event) => updateState('vrGradient', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>평균 단가</span>
                  <NumberInput
                    inputMode="decimal"
                    min="0"
                    type="number"
                    value={state.vrStartAvgPrice}
                    onChange={(event) => updateVrStart('vrStartAvgPrice', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>보유 수량</span>
                  <NumberInput
                    inputMode="decimal"
                    min="0"
                    step="1"
                    type="number"
                    value={state.vrStartQty}
                    onChange={(event) => updateVrStart('vrStartQty', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>시작 현금</span>
                  <NumberInput
                    inputMode="numeric"
                    min="0"
                    type="number"
                    value={state.vrStartPool}
                    onChange={(event) => updateState('vrStartPool', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>남은 현금</span>
                  <NumberInput
                    inputMode="numeric"
                    min="0"
                    type="number"
                    value={state.vrPool}
                    onChange={(event) => updateState('vrPool', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>현금 사용 한도 %</span>
                  <NumberInput
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="1"
                    type="number"
                    value={state.vrPoolLimit}
                    onChange={(event) => updateState('vrPoolLimit', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>기준 범위 %</span>
                  <NumberInput
                    inputMode="decimal"
                    min="1"
                    max="50"
                    step="1"
                    type="number"
                    value={state.vrBandPercent}
                    onChange={(event) => updateState('vrBandPercent', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>예약 단위</span>
                  <NumberInput
                    inputMode="numeric"
                    min="1"
                    max="100"
                    type="number"
                    value={state.vrOrderUnit}
                    onChange={(event) => updateState('vrOrderUnit', Number(event.target.value))}
                  />
                </label>
                {state.vrVersionId !== 'lump' ? (
                  <label className="field">
                    <span>{state.vrVersionId === 'contribution' ? '적립금' : '인출금'}</span>
                    <NumberInput
                      inputMode="numeric"
                      min="0"
                      type="number"
                      value={state.vrRegularAmount}
                      onChange={(event) => updateState('vrRegularAmount', Number(event.target.value))}
                    />
                  </label>
                ) : null}
                <label className="field">
                  <span>시작일</span>
                  <input
                    type="date"
                    value={state.vrStartDate}
                    min={getNextMondayIso()}
                    step={7}
                    onBlur={(event) => updateVrCycleStartDate(event.currentTarget.value)}
                    onChange={(event) => updateVrCycleStartDate(event.currentTarget.value)}
                    onInput={(event) => updateVrCycleStartDate(event.currentTarget.value)}
                  />
                </label>
                <label className="field">
                  <span>종료일</span>
                  <input
                    readOnly
                    type="date"
                    value={state.vrEndDate}
                  />
                </label>
              </div>
              {settingsMessage ? <p className="data-message">{settingsMessage}</p> : null}
            </>
          )}
          </div>
        </details>

        <section className="panel guide-panel">
          <div className="panel-heading">
            <h2>{state.strategyMode === 'mume' ? '오늘 주문' : '리밸런싱 상세'}</h2>
          </div>

          {state.strategyMode === 'mume' ? (
            <>
              <div className="metric-grid">
                <div>
                  <span>상태</span>
                  <strong>{mumeGuide.phase}</strong>
                </div>
                <div>
                  <span>1회차</span>
                  <strong>{formatMoney(mumeGuide.unit)}</strong>
                </div>
                <div>
                  <span>T</span>
                  <strong>{formatNumber(mumeGuide.tValue, 0)}</strong>
                </div>
                <div>
                  <span>수익 기준가</span>
                  <strong>{formatMoney(mumeGuide.starPrice)}</strong>
                </div>
              </div>

              <div className="progress-track" aria-label="시드 진행률">
                <span style={{ width: `${mumeGuide.progress}%` }} />
              </div>

              <div className="order-columns">
                <OrderList
                  emptyText="매수 없음"
                  orders={mumeGuide.buyOrders}
                  title="매수"
                />
                <OrderList
                  emptyText="매도 없음"
                  orders={mumeGuide.sellOrders}
                  title="매도"
                />
              </div>
            </>
          ) : (
            <>
              <div className="vr-status">
                <span>{selectedVrVersion.label}</span>
                <strong>{vrGuide.status}</strong>
              </div>

              <div className="metric-grid vr-metrics">
                <div>
                  <span>목표 보유액</span>
                  <strong>{formatMoney(vrGuide.targetValue)}</strong>
                </div>
                <div>
                  <span>현재 총자산</span>
                  <strong>{formatMoney(vrGuide.vNow)}</strong>
                </div>
                <div>
                  <span>평가금</span>
                  <strong>{formatMoney(vrGuide.marketValue)}</strong>
                </div>
                <div>
                  <span>남은 현금</span>
                  <strong>{formatMoney(state.vrPool)}</strong>
                </div>
                <div>
                  <span>현재 수량</span>
                  <strong>{formatNumber(selectedVrPosition.holdingQty, 0)}주</strong>
                </div>
                <div>
                  <span>현재 평균 매수가</span>
                  <strong>{formatMoney(selectedVrPosition.avgPrice)}</strong>
                </div>
                <div>
                  <span>하단</span>
                  <strong>{formatMoney(vrGuide.lowerValue)}</strong>
                </div>
                <div>
                  <span>상단</span>
                  <strong>{formatMoney(vrGuide.upperValue)}</strong>
                </div>
              </div>

              <div className="pool-meter">
                <div>
                  <span>쓴 현금</span>
                  <strong>
                    {formatMoney(vrGuide.poolUsed)} / {formatMoney(vrGuide.poolAllowed)}
                  </strong>
                </div>
                <div className="progress-track compact" aria-label="현금 사용률">
                  <span style={{ width: `${clamp(vrGuide.poolUsedPercent, 0, 100)}%` }} />
                </div>
                <small>사용 가능 현금 {formatMoney(vrGuide.poolRemainingAllowed)}</small>
                <div className="pool-actions">
                  <NumberInput
                    aria-label="현금 조정 금액"
                    inputMode="numeric"
                    min="0"
                    type="number"
                    value={poolAdjustment}
                    onChange={(event) => setPoolAdjustment(event.target.value)}
                    placeholder="현금 조정"
                  />
                  <button type="button" onClick={() => updateVrPool('increase')}>
                    넣기
                  </button>
                  <button type="button" onClick={() => updateVrPool('decrease')}>
                    빼기
                  </button>
                  <button type="button" onClick={() => updateVrPool('direct')}>
                    직접
                  </button>
                </div>
              </div>

              <div className="order-line featured-order">
                <div>
                  <span>{vrGuide.status}</span>
                  <strong>
                    {vrGuide.actionQty > 0
                      ? `${formatNumber(vrGuide.actionQty, 0)}주`
                      : '주문 없음'}
                  </strong>
                </div>
                <div>
                  <span>기준가</span>
                  <strong>{formatMoney(vrGuide.actionPrice)}</strong>
                </div>
                <div>
                  <span>금액</span>
                  <strong>{formatMoney(vrGuide.actionAmount)}</strong>
                </div>
                <div>
                  <span>주문 후 현금</span>
                  <strong>{formatMoney(vrGuide.poolAfter)}</strong>
                </div>
              </div>

              <div className="next-cycle">
                <div>
                  <span>다음 기준</span>
                  <strong>{formatMoney(vrGuide.nextCycleV)}</strong>
                </div>
                <div>
                  <span>다음 현금</span>
                  <strong>{formatMoney(vrGuide.nextCyclePool)}</strong>
                </div>
                <button className="ghost-button" type="button" onClick={renewVrCycle}>
                  사이클 갱신
                </button>
              </div>

              <div className="reserved-orders">
                <div className="reserved-heading">
                  <h3>예약 주문표</h3>
                  <span>
                    기준 {formatNumber(vrOrderBaseQty, 0)}주 · {formatNumber(state.vrOrderUnit, 0)}주 단위
                  </span>
                </div>
                <div className="reserved-columns">
                  <ReservedOrderList
                    bandPrice={vrOrderBook.minV}
                    emptyText={vrOrderBaseQty > 0 ? '매수 산출 예정' : '시작 수량 필요'}
                    orders={vrOrderBook.buyOrders}
                    title="매수표"
                    type="buy"
                  />
                  <ReservedOrderList
                    bandPrice={vrOrderBook.maxV}
                    emptyText={vrOrderBaseQty > 0 ? '매도 산출 예정' : '시작 수량 필요'}
                    orders={vrOrderBook.sellOrders}
                    title="매도표"
                    type="sell"
                  />
                </div>
              </div>
            </>
          )}
        </section>

        <section className="panel report-panel">
          <div className="panel-heading">
            <h2>리포트</h2>
          </div>

          <div className="report-summary-grid">
            <div>
              <span>총 손익</span>
              <strong className={reportSummary.pnl >= 0 ? 'up' : 'down'}>
                {formatMoney(reportSummary.pnl)}
              </strong>
            </div>
            <div>
              <span>{state.strategyMode === 'vr' ? '기준 대비' : '시드 대비'}</span>
              <strong className={reportSummary.seedProfitRate >= 0 ? 'up' : 'down'}>
                {formatPercent(reportSummary.seedProfitRate)}
              </strong>
            </div>
            <div>
              <span>평가금</span>
              <strong>{formatMoney(reportSummary.marketValue)}</strong>
            </div>
            <div>
              <span>{state.strategyMode === 'vr' ? '현금 포함' : '활성 평가'}</span>
              <strong>
                {formatMoney(reportSummary.marketValue + reportSummary.poolValue)}
              </strong>
            </div>
            <div>
              <span>운용 수익률</span>
              <strong className={reportSummary.profitRate >= 0 ? 'up' : 'down'}>
                {formatPercent(reportSummary.profitRate)}
              </strong>
            </div>
            <div>
              <span>거래 수</span>
              <strong>{formatNumber(reportSummary.tradeCount, 0)}</strong>
            </div>
            <div>
              <span>총매수</span>
              <strong>{formatMoney(reportSummary.totalBuy)}</strong>
            </div>
            <div>
              <span>총매도</span>
              <strong>{formatMoney(reportSummary.totalSell)}</strong>
            </div>
            <div className="span-two">
              <span>최고 기여</span>
              <strong>{reportSummary.bestStock}</strong>
            </div>
          </div>

          {state.reports.length > 0 ? (
            <div className="completed-reports" aria-label="완료 기록">
              <div className="completed-heading">
                <span>완료 기록</span>
                <div className="completed-heading-actions">
                  <strong>{formatNumber(filteredReports.length, 0)}</strong>
                  <button className="small-action" type="button" onClick={clearReportFilters}>
                    필터 해제
                  </button>
                  <button className="small-action" type="button" onClick={deleteFilteredReports}>
                    삭제
                  </button>
                </div>
              </div>
              <div className="report-filters">
                <select
                  aria-label="완료 전략 필터"
                  value={reportStrategyFilter}
                  onChange={(event) =>
                    setReportStrategyFilter(event.target.value as ReportStrategyFilter)
                  }
                >
                  <option value="all">전체 전략</option>
                  <option value="vr">리밸런싱</option>
                  <option value="mume">무한매수</option>
                </select>
                <select
                  aria-label="완료 종목 필터"
                  value={reportStockFilter}
                  onChange={(event) => setReportStockFilter(event.target.value)}
                >
                  <option value="all">전체 종목</option>
                  {STOCKS.map((stock) => (
                    <option key={stock.id} value={stock.id}>
                      {stock.ticker}
                    </option>
                  ))}
                </select>
                <label className="mini-date-field">
                  <span>시작</span>
                  <input
                    aria-label="완료 시작일 필터"
                    type="date"
                    value={reportStartDateFilter}
                    onChange={(event) => setReportStartDateFilter(event.target.value)}
                    onInput={(event) => setReportStartDateFilter(event.currentTarget.value)}
                  />
                </label>
                <label className="mini-date-field">
                  <span>종료</span>
                  <input
                    aria-label="완료 종료일 필터"
                    type="date"
                    value={reportEndDateFilter}
                    onChange={(event) => setReportEndDateFilter(event.target.value)}
                    onInput={(event) => setReportEndDateFilter(event.currentTarget.value)}
                  />
                </label>
              </div>
              {reportTags.length > 0 ? (
                <div className="tag-filter-row" aria-label="완료 태그 필터">
                  <button
                    className={reportTagFilter === '' ? 'is-active' : ''}
                    type="button"
                    onClick={() => setReportTagFilter('')}
                  >
                    전체
                  </button>
                  {reportTags.map((tag) => (
                    <button
                      className={reportTagFilter === tag ? 'is-active' : ''}
                      key={tag}
                      type="button"
                      onClick={() => setReportTagFilter(tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="completed-summary">
                <div>
                  <span>완료 손익</span>
                  <strong className={completedReportSummary.pnl >= 0 ? 'up' : 'down'}>
                    {formatMoney(completedReportSummary.pnl)}
                  </strong>
                </div>
                <div>
                  <span>승률</span>
                  <strong>{formatPercent(completedReportSummary.winRate)}</strong>
                </div>
                <div>
                  <span>완료 매수</span>
                  <strong>{formatMoney(completedReportSummary.totalBuy)}</strong>
                </div>
                <div>
                  <span>완료 매도</span>
                  <strong>{formatMoney(completedReportSummary.totalSell)}</strong>
                </div>
              </div>
              {filteredReports.length > 0 ? (
                filteredReports.slice(0, 8).map((completedReport) => (
                  <div className="completed-report-row" key={completedReport.id}>
                    <div>
                      <span>
                        {completedReport.startDate} - {completedReport.endDate}
                      </span>
                      <strong>
                        {completedReport.alias ? `${completedReport.alias} · ` : ''}
                        {completedReport.strategy === 'vr' ? '리밸런싱' : '무한매수'} ·{' '}
                        {completedReport.version} · {getStock(completedReport.stockId).ticker}
                      </strong>
                      {completedReport.tags.length > 0 ? (
                        <div className="tag-row">
                          {completedReport.tags.map((tag) => (
                            <span key={tag}>#{tag}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <strong className={completedReport.pnl >= 0 ? 'up' : 'down'}>
                      {formatMoney(completedReport.pnl)}
                    </strong>
                    <span>{formatPercent(completedReport.profitRate)}</span>
                    <button
                      aria-label="완료 기록 삭제"
                      className="icon-button"
                      type="button"
                      onClick={() => deleteCompletedReport(completedReport.id)}
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">완료 기록 없음</div>
              )}
            </div>
          ) : null}

          <div className="data-actions">
            <button className="ghost-button" type="button" onClick={completeCurrentOperation}>
              운용 종료
            </button>
            <button className="ghost-button" type="button" onClick={exportData}>
              백업
            </button>
            <button className="ghost-button" type="button" onClick={importData}>
              복원
            </button>
          </div>

          <label className="field data-field">
            <span>데이터</span>
            <textarea
              rows={4}
              value={backupText}
              onChange={(event) => setBackupText(event.target.value)}
              placeholder="백업 JSON"
            />
          </label>
          {dataMessage ? <p className="data-message">{dataMessage}</p> : null}
        </section>

        <section className="panel table-panel">
          <div className="panel-heading">
            <h2>거래 내역</h2>
            <button className="small-action" type="button" onClick={recalculateTransactions}>
              재계산
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>일시</th>
                  <th>전략</th>
                  <th>구분</th>
                  <th>수량</th>
                  <th>가격</th>
                  <th>금액</th>
                  <th>메모</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {selectedTransactions.length > 0 ? (
                  selectedTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{new Date(transaction.date ?? transaction.at).toLocaleDateString('ko-KR')}</td>
                      <td>{transaction.strategy === 'mume' ? '무한' : '리밸'}</td>
                      <td className={transaction.type === 'buy' ? 'up' : 'down'}>
                        {transaction.type === 'buy' ? '매수' : '매도'}
                      </td>
                      <td>{formatNumber(transaction.quantity, 0)}</td>
                      <td>{formatMoney(transaction.price)}</td>
                      <td>{formatMoney(transaction.price * transaction.quantity)}</td>
                      <td>{transaction.memo || '-'}</td>
                      <td>
                        <button
                          aria-label="거래 삭제"
                          className="icon-button"
                          type="button"
                          onClick={() => deleteTransaction(transaction.id)}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>아직 거래 내역이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      </details>
    </main>
  )
}

function OrderList({
  emptyText,
  orders,
  title,
}: {
  emptyText: string
  orders: OrderLine[]
  title: string
}) {
  return (
    <div className="order-list">
      <h3>{title}</h3>
      {orders.length > 0 ? (
        orders.map((order, index) => (
          <div
            className="order-line"
            key={`${order.title}-${order.method}-${index}`}
          >
            <div>
              <span>{order.title}</span>
              <strong>{order.method}</strong>
            </div>
            <div>
              <span>가격</span>
              <strong>{formatMoney(order.price)}</strong>
            </div>
            <div>
              <span>수량</span>
              <strong>{formatNumber(order.quantity, 0)}주</strong>
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state">{emptyText}</div>
      )}
    </div>
  )
}

function CompactOrderList({
  emptyText,
  orders,
  title,
}: {
  emptyText: string
  orders: OrderLine[]
  title: string
}) {
  return (
    <div className="compact-order-list">
      <div className="compact-order-list-head">
        <strong>{title}</strong>
        <span>{formatNumber(orders.length, 0)}개</span>
      </div>
      {orders.length > 0 ? (
        <div className="compact-order-rows">
          {orders.map((order, index) => (
            <div className="compact-order-row" key={`${order.title}-${order.method}-${index}`}>
              <span>{order.method}</span>
              <strong>{formatMoney(order.price)}</strong>
              <span>{formatNumber(order.quantity, 0)}주</span>
              <small>{order.title}</small>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">{emptyText}</div>
      )}
    </div>
  )
}

function ReservedOrderList({
  bandPrice,
  emptyText,
  orders,
  title,
  type,
}: {
  bandPrice: number
  emptyText: string
  orders: VrReservedOrder[]
  title: string
  type: TradeType
}) {
  const visibleOrders = orders.slice(0, 8)

  return (
    <div className="reserved-list">
      <div className="reserved-list-head">
        <strong className={type === 'buy' ? 'up' : 'down'}>{title}</strong>
        <span>{type === 'buy' ? '하단' : '상단'} {formatMoney(bandPrice)}</span>
      </div>
      <div className="reserved-table">
        <table>
          <thead>
            <tr>
              <th>수량</th>
              <th>가격</th>
              <th>현금</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.length > 0 ? (
              visibleOrders.map((order) => (
                <tr key={`${type}-${order.quantity}-${order.price}`}>
                  <td>{formatNumber(order.quantity, 0)}주</td>
                  <td>{formatMoney(order.price)}</td>
                  <td>{formatMoney(order.poolBalance)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App
