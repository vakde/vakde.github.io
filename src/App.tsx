import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'

type Holding = {
  name: string
  ticker: string
  value: number
  share: number
  returnRate: number
  risk: '낮음' | '보통' | '높음'
}

type Allocation = {
  label: string
  share: number
  color: string
}

const holdings: Holding[] = [
  { name: 'TIGER 미국S&P500', ticker: '360750', value: 18400000, share: 31, returnRate: 16.8, risk: '보통' },
  { name: '삼성전자', ticker: '005930', value: 12800000, share: 22, returnRate: -4.2, risk: '보통' },
  { name: '현금성 자산', ticker: 'CASH', value: 9200000, share: 15, returnRate: 0.0, risk: '낮음' },
  { name: 'KODEX 단기채권', ticker: '153130', value: 7600000, share: 13, returnRate: 2.1, risk: '낮음' },
  { name: '비트코인', ticker: 'BTC', value: 6800000, share: 11, returnRate: 38.5, risk: '높음' },
  { name: '애플', ticker: 'AAPL', value: 4700000, share: 8, returnRate: 9.4, risk: '보통' },
]

const allocation: Allocation[] = [
  { label: '미국 주식/ETF', share: 39, color: '#1d4f67' },
  { label: '국내 주식', share: 22, color: '#2f6f57' },
  { label: '현금', share: 15, color: '#69816f' },
  { label: '채권', share: 13, color: '#9b7b46' },
  { label: '가상자산', share: 11, color: '#b45845' },
]

const riskSignals = [
  '상위 2개 자산 비중이 53%로 높습니다.',
  '주식성 자산과 가상자산 합산 비중이 72%입니다.',
  '현금 비중은 15%로 단기 유동성은 양호합니다.',
]

function formatWon(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`
}

function App() {
  const [fileName, setFileName] = useState('')

  const totalValue = useMemo(() => holdings.reduce((sum, item) => sum + item.value, 0), [])
  const topHolding = holdings[0]

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setFileName(file ? file.name : '')
  }

  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="주요 메뉴">
        <a className="brand" href="#top" aria-label="Vakde Wealth Desk 홈">
          <span>V</span>
          <strong>Vakde Wealth Desk</strong>
        </a>
        <div className="nav-links">
          <a href="#upload">업로드</a>
          <a href="#report">샘플 리포트</a>
          <a href="#privacy">보안</a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Portfolio Snapshot AI</p>
          <h1>
            <span>캡처 한 장을</span>
            <span>투자 리포트로</span>
          </h1>
          <p>
            증권사 앱 화면을 업로드하면 보유 종목, 평가금액, 수익률을 정리하고 자산 배분 관점에서
            집중도와 위험 신호를 보여주는 개인 자산 분석 데스크입니다.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#upload">캡처 업로드</a>
            <a className="secondary-action" href="#report">샘플 분석 보기</a>
          </div>
        </div>

        <div className="capture-visual" aria-label="포트폴리오 캡처 분석 화면 예시">
          <div className="phone-frame">
            <div className="phone-header">
              <span />
              <b>MY 자산</b>
              <small>09:41</small>
            </div>
            <div className="balance-block">
              <small>총 평가금액</small>
              <strong>59,500,000원</strong>
              <span>+8.6% 전체 수익률</span>
            </div>
            {holdings.slice(0, 4).map((holding) => (
              <div className="mini-row" key={holding.ticker}>
                <span>{holding.name}</span>
                <b>{holding.share}%</b>
              </div>
            ))}
          </div>
          <div className="analysis-float">
            <span>분석 완료</span>
            <strong>균형 점수 74</strong>
            <small>주식 편중 주의 · 현금 양호</small>
          </div>
        </div>
      </section>

      <section className="upload-panel" id="upload">
        <div>
          <p className="eyebrow">Upload Flow</p>
          <h2>캡처 한 장으로 시작</h2>
          <p>PNG, JPG, HEIC, PDF 형식의 포트폴리오 화면을 올리는 컨셉입니다. 실제 서비스에서는 OCR 인식 후 사용자가 결과를 확인하고 수정하는 단계를 둡니다.</p>
        </div>
        <label className="dropzone">
          <input accept="image/*,.pdf" type="file" onChange={handleUpload} />
          <span>파일 선택</span>
          <strong>{fileName || '증권사 포트폴리오 캡처를 업로드하세요'}</strong>
          <small>민감 정보는 분석 전에 마스킹하는 흐름으로 설계합니다.</small>
        </label>
      </section>

      <section className="metrics-grid" aria-label="요약 지표">
        <article>
          <span>총 평가금액</span>
          <strong>{formatWon(totalValue)}</strong>
          <small>캡처에서 읽은 보유 자산 합계</small>
        </article>
        <article>
          <span>최대 보유</span>
          <strong>{topHolding.share}%</strong>
          <small>{topHolding.name}</small>
        </article>
        <article>
          <span>위험 신호</span>
          <strong>3개</strong>
          <small>편중, 변동성, 유동성 기준</small>
        </article>
        <article>
          <span>균형 점수</span>
          <strong>74</strong>
          <small>샘플 기준 보통 이상</small>
        </article>
      </section>

      <section className="report-grid" id="report">
        <article className="panel allocation-panel">
          <div className="section-head">
            <p className="eyebrow">Allocation</p>
            <h2>자산 배분</h2>
          </div>
          <div className="donut" aria-hidden="true">
            <div className="donut-center">
              <span>주식성</span>
              <strong>72%</strong>
            </div>
          </div>
          <div className="allocation-list">
            {allocation.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <div><i style={{ width: `${item.share}%`, background: item.color }} /></div>
                <b>{item.share}%</b>
              </div>
            ))}
          </div>
        </article>

        <article className="panel holdings-panel">
          <div className="section-head">
            <p className="eyebrow">Detected Holdings</p>
            <h2>인식된 보유 자산</h2>
          </div>
          <div className="holding-table">
            {holdings.map((holding) => (
              <div className="holding-row" key={holding.ticker}>
                <div>
                  <strong>{holding.name}</strong>
                  <small>{holding.ticker}</small>
                </div>
                <span>{formatWon(holding.value)}</span>
                <b className={holding.returnRate < 0 ? 'negative' : 'positive'}>
                  {holding.returnRate > 0 ? '+' : ''}{holding.returnRate.toFixed(1)}%
                </b>
                <em>{holding.risk}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="panel risk-panel">
          <div className="section-head">
            <p className="eyebrow">Risk Signals</p>
            <h2>진단 요약</h2>
          </div>
          <ul>
            {riskSignals.map((signal) => <li key={signal}>{signal}</li>)}
          </ul>
        </article>

        <article className="panel recommendation-panel">
          <div className="section-head">
            <p className="eyebrow">Next Action</p>
            <h2>개선 아이디어</h2>
          </div>
          <div className="recommendation-copy">
            <strong>단일 종목과 위험자산 비중을 낮추고, 채권/현금성 자산 비중을 20~25%까지 높이는 시나리오를 비교합니다.</strong>
            <p>이 영역은 투자 권유가 아니라 사용자가 직접 판단할 수 있도록 리밸런싱 후보와 변화 폭을 보여주는 정보형 리포트로 설계합니다.</p>
          </div>
        </article>
      </section>

      <section className="privacy-band" id="privacy">
        <p className="eyebrow">Privacy First</p>
        <h2>금융 화면을 다루는 서비스답게</h2>
        <div>
          <span>주민번호, 계좌번호, 주문번호 자동 마스킹</span>
          <span>분석 전 원본 삭제 옵션</span>
          <span>저장 없는 1회성 리포트 모드</span>
        </div>
      </section>
    </main>
  )
}

export default App
