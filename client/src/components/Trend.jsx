import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api.js';
import { t, n2 } from '../lib/i18n.js';
import { money, num, monthLabel } from '../lib/util.js';
import { useApi, Spinner } from './ui.jsx';

// Change vs previous month. For costs, going up is bad (red), going down is good (green).
function Delta({ now, prev, costLike = true, cur }) {
  if (!prev && !now) return <span className="delta flat">—</span>;
  if (!prev) return <span className="delta flat">{t('new')}</span>;
  const diff = now - prev;
  const pct = (diff / prev) * 100;
  if (Math.abs(pct) < 0.5) return <span className="delta flat">● {t('same')}</span>;
  const up = diff > 0;
  const good = costLike ? !up : up;
  return (
    <span className={`delta ${good ? 'good' : 'bad'}`}>
      {up ? '▲' : '▼'} {n2(Math.abs(pct).toFixed(1))}%
      {cur !== undefined && <span className="tiny"> ({up ? '+' : '−'}{money(Math.abs(diff), cur).replace(/^-/, '')})</span>}
    </span>
  );
}

function shortMonth(m) {
  return monthLabel(m).split(' ')[0].slice(0, 3);
}

// Bars = bazar cost, line = meal rate
function TrendChart({ data, cur }) {
  const W = 640;
  const H = 220;
  const P = { l: 44, r: 44, t: 16, b: 30 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const maxB = Math.max(1, ...data.map((d) => d.totalBazar));
  const maxR = Math.max(1, ...data.map((d) => d.mealRate));
  const step = iw / data.length;
  const bw = Math.min(38, step * 0.55);
  const x = (i) => P.l + step * i + step / 2;
  const yB = (v) => P.t + ih - (v / maxB) * ih;
  const yR = (v) => P.t + ih - (v / maxR) * ih * 0.9;
  const pts = data.map((d, i) => (d.mealRate ? `${x(i)},${yR(d.mealRate)}` : null)).filter(Boolean);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend-chart" role="img" aria-label="trend chart">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={P.l} x2={W - P.r} y1={P.t + ih * f} y2={P.t + ih * f} className="grid-line" />
      ))}
      {data.map((d, i) => (
        <g key={d.month}>
          <rect x={x(i) - bw / 2} y={yB(d.totalBazar)} width={bw} height={Math.max(0, P.t + ih - yB(d.totalBazar))} rx="5" className="bar">
            <title>{`${monthLabel(d.month)} — ${t('totalBazar')}: ${money(d.totalBazar, cur)}`}</title>
          </rect>
          <text x={x(i)} y={H - 10} textAnchor="middle" className="axis">
            {shortMonth(d.month)}
          </text>
        </g>
      ))}
      <text x={P.l - 6} y={P.t + 4} textAnchor="end" className="axis">
        {Math.round(maxB / 1000)}k
      </text>
      <text x={W - P.r + 6} y={P.t + ih * 0.1 + 4} className="axis rate-axis">
        ৳{Math.round(maxR)}
      </text>
      {pts.length > 1 && <polyline points={pts.join(' ')} className="rate-line" />}
      {data.map((d, i) =>
        d.mealRate ? (
          <g key={'p' + d.month}>
            <circle cx={x(i)} cy={yR(d.mealRate)} r="4.5" className="rate-dot">
              <title>{`${monthLabel(d.month)} — ${t('mealRate')}: ${money(d.mealRate, cur)}`}</title>
            </circle>
            <text x={x(i)} y={yR(d.mealRate) - 9} textAnchor="middle" className="rate-label">
              {num(d.mealRate)}
            </text>
          </g>
        ) : null,
      )}
    </svg>
  );
}

export function TrendCard({ month, cur = '৳' }) {
  const { data, loading } = useApi(() => api('trends', { months: 12 }), []);
  const [span, setSpan] = useState(6);
  const scroller = useRef(null);

  useEffect(() => {
    // keep the selected month visible in the month slider
    const el = scroller.current?.querySelector('.mslide.sel');
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [data, month]);

  if (loading && !data) return <Spinner />;
  if (!data) return null;
  const idx = Math.max(0, data.findIndex((d) => d.month === month));
  const curM = data[idx] || data[data.length - 1];
  const prevM = data[idx - 1];
  const shown = data.slice(Math.max(0, data.length - span));

  const tiles = [
    { k: 'mealRate', label: t('mealRate'), fmt: (v) => money(v, cur), cost: true },
    { k: 'totalBazar', label: t('totalBazar'), fmt: (v) => money(v, cur), cost: true, showAbs: true },
    { k: 'totalMeals', label: t('totalMeals'), fmt: (v) => num(v), cost: false },
    { k: 'totalDeposit', label: t('totalDeposit'), fmt: (v) => money(v, cur), cost: false },
  ];

  return (
    <div className="card trend-card">
      <div className="card-head">
        <h3>📈 {t('trendTitle')}</h3>
        <span className="small muted">
          {monthLabel(curM.month)} {t('vs')} {prevM ? monthLabel(prevM.month) : '—'}
        </span>
      </div>

      <div className="grid g4">
        {tiles.map((tl) => (
          <div className="trend-tile" key={tl.k}>
            <div className="k">{tl.label}</div>
            <div className="v">{tl.fmt(curM[tl.k])}</div>
            <div className="tiny muted">
              {t('lastMonth')}: {prevM ? tl.fmt(prevM[tl.k]) : '—'}
            </div>
            <Delta now={curM[tl.k]} prev={prevM?.[tl.k] || 0} costLike={tl.cost} cur={tl.showAbs ? cur : undefined} />
          </div>
        ))}
      </div>

      <div className="row between mt">
        <div className="row small" style={{ gap: 14 }}>
          <span>
            <i className="lg bar-lg" /> {t('totalBazar')}
          </span>
          <span>
            <i className="lg line-lg" /> {t('mealRate')}
          </span>
        </div>
        <label className="row small" style={{ gap: 8 }}>
          {t('showMonths')}: <b>{n2(span)}</b>
          <input type="range" min="2" max="12" value={span} onChange={(e) => setSpan(Number(e.target.value))} className="slider" />
        </label>
      </div>
      <TrendChart data={shown} cur={cur} />

      <div className="mslider" ref={scroller}>
        {data
          .map((d, i) => ({ d, p: data[i - 1] }))
          .filter(({ d }) => d.totalMeals || d.totalBazar || d.month === curM.month)
          .map(({ d, p }) => (
            <div key={d.month} className={`mslide ${d.month === curM.month ? 'sel' : ''}`}>
              <div className="bold">{monthLabel(d.month)}</div>
              <div className="tiny muted">{t('mealRate')}</div>
              <div className="v">{money(d.mealRate, cur)}</div>
              <Delta now={d.mealRate} prev={p?.mealRate || 0} />
              <div className="tiny muted mt">
                {t('totalBazar')}: <b>{money(d.totalBazar, cur)}</b>
              </div>
              <div className="tiny muted">
                {t('totalMeals')}: <b>{num(d.totalMeals)}</b>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
