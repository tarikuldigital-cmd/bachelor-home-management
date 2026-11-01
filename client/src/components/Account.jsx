import { Link } from 'react-router-dom';
import { t, n2 } from '../lib/i18n.js';
import { money, num, dateLabel, monthLabel } from '../lib/util.js';
import { Empty, Avatar } from './ui.jsx';

// Personal account block — only shown after login (member sees own, manager sees anyone)
// Meal account and service-charge account are completely separate.
export function DueAlert({ stats, cur, month }) {
  if (!stats) return null;
  if (stats.mealDue > 0 || stats.serviceDue > 0)
    return (
      <div className="alert red">
        <span style={{ fontSize: 26 }}>⚠️</span>
        <div className="grow">
          <div className="bold">
            {t('dueAlert')} — {monthLabel(month)}
          </div>
          <div className="row small" style={{ gap: 14, marginTop: 4 }}>
            <span>
              🍛 {t('mealDue')}: <b className={stats.mealDue > 0 ? 'neg' : ''}>{money(stats.mealDue, cur)}</b>
            </span>
            <span>
              🧾 {t('serviceDue')}: <b className={stats.serviceDue > 0 ? 'neg' : ''}>{money(stats.serviceDue, cur)}</b>
            </span>
          </div>
        </div>
      </div>
    );
  return (
    <div className="alert green">
      <span style={{ fontSize: 24 }}>✅</span>
      <div className="grow bold">{t('allClear')}</div>
    </div>
  );
}

function AccResult({ value, cur, kind }) {
  const v = Number(value) || 0;
  if (Math.abs(v) < 0.005) return <span className="acc-result ok">✓ {t('settled')}</span>;
  if (v > 0) return <span className="acc-result pos">{kind === 'service' ? t('advance') : t('willGet')}: {money(v, cur)}</span>;
  return <span className="acc-result neg">{t('willPay')}: {money(-v, cur)}</span>;
}

export function AccountStats({ d, cur }) {
  const s = d.stats;
  if (!s) return <Empty />;
  return (
    <div className="grid g2">
      <div className="card acc meal-acc">
        <div className="card-head">
          <h3>🍛 {t('mealAccount')}</h3>
          <span className="badge green">{t('mealRate')}: {money(d.summary.mealRate, cur)}</span>
        </div>
        <div className="acc-grid">
          <div>
            <div className="k">{t('myMeals')}</div>
            <div className="v">{num(s.mealCount)}</div>
          </div>
          <div>
            <div className="k">{t('mealCost')}</div>
            <div className="v">{money(s.mealCost, cur)}</div>
            <div className="tiny muted">
              {num(s.mealCount)} × {money(d.summary.mealRate, cur)}
            </div>
          </div>
          <div>
            <div className="k">{t('mealDeposit')}</div>
            <div className="v">{money(s.mealDeposit, cur)}</div>
          </div>
        </div>
        <AccResult value={s.mealBalance} cur={cur} kind="meal" />
        {s.bazarSpent > 0 && (
          <div className="tiny muted mt">
            {t('bazarSpent')}: {money(s.bazarSpent, cur)}
          </div>
        )}
      </div>

      <div className="card acc service-acc">
        <div className="card-head">
          <h3>🧾 {t('serviceAccount')}</h3>
          <span className="badge blue">🔒 {t('member')} + {t('manager')}</span>
        </div>
        <div className="acc-grid">
          <div>
            <div className="k">{t('yourShare')}</div>
            <div className="v">{money(s.serviceCharge, cur)}</div>
          </div>
          <div>
            <div className="k">{t('serviceDeposit')}</div>
            <div className="v">{money(s.serviceDeposit, cur)}</div>
          </div>
          <div>
            <div className="k">{t('serviceDue')}</div>
            <div className={`v ${s.serviceDue > 0 ? 'neg' : ''}`}>{money(s.serviceDue, cur)}</div>
          </div>
        </div>
        <AccResult value={s.serviceBalance} cur={cur} kind="service" />
        {d.bills.length > 0 && (
          <div className="kv mt small">
            {d.bills.map((b) => (
              <FragmentRow key={b.id} k={t(b.type)} v={`${money(b.share, cur)}`} sub={`${money(b.amount, cur)} ÷ ${n2(b.splitCount)}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FragmentRow({ k, v, sub }) {
  return (
    <>
      <span className="k">{k}</span>
      <span>
        {v} <span className="tiny muted">({sub})</span>
      </span>
    </>
  );
}

export function DepositList({ deposits, cur }) {
  if (!deposits.length) return <Empty />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('date')}</th>
            <th>{t('type')}</th>
            <th>{t('note')}</th>
            <th className="num">{t('amount')}</th>
          </tr>
        </thead>
        <tbody>
          {deposits.map((x) => (
            <tr key={x.id}>
              <td>{dateLabel(x.date)}</td>
              <td>
                <span className={`badge ${x.type === 'service' ? 'blue' : 'green'}`}>{x.type === 'service' ? t('serviceDep') : t('mealDep')}</span>
              </td>
              <td className="muted">{x.note}</td>
              <td className="num">{money(x.amount, cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MembersTable({ rows, cur, month }) {
  if (!rows.length) return <Empty />;
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const bal = (v, kind) => {
    if (Math.abs(v) < 0.005) return <span className="badge green">✓</span>;
    if (v > 0) return <span className="pos">+{money(v, cur)}</span>;
    return <span className="badge red">{money(-v, cur)}</span>;
  };
  return (
    <>
      <div className="only-mobile">
        {rows.map((r) => (
          <div className="mcard" key={r.memberId}>
            <div className="top">
              <Avatar src={r.photo} name={r.name} size={36} />
              <Link to={`/app/members/${r.memberId}`} className="bold grow" style={{ color: 'var(--text)' }}>
                {r.name}
              </Link>
            </div>
            <div className="tiny bold mt">🍛 {t('mealAccount')}</div>
            <div className="nums">
              <div>
                <div className="k">{t('meals')}</div>
                <div className="v">{num(r.mealCount)}</div>
              </div>
              <div>
                <div className="k">{t('mealCost')}</div>
                <div className="v">{money(r.mealCost, cur)}</div>
              </div>
              <div>
                <div className="k">{t('mealDeposit')}</div>
                <div className="v">{money(r.mealDeposit, cur)}</div>
              </div>
            </div>
            <div className="small mt">{bal(r.mealBalance)} <span className="tiny muted">({r.mealBalance >= 0 ? t('willGet') : t('willPay')})</span></div>
            <div className="tiny bold mt">🧾 {t('serviceAccount')}</div>
            <div className="nums">
              <div>
                <div className="k">{t('serviceCharge')}</div>
                <div className="v">{money(r.serviceCharge, cur)}</div>
              </div>
              <div>
                <div className="k">{t('serviceDeposit')}</div>
                <div className="v">{money(r.serviceDeposit, cur)}</div>
              </div>
              <div>
                <div className="k">{t('serviceDue')}</div>
                <div className={`v ${r.serviceDue > 0 ? 'neg' : ''}`}>{money(r.serviceDue, cur)}</div>
              </div>
            </div>
            <Link className="btn sm mt block" to={`/invoice/${r.memberId}/${month}`}>
              🧾 {t('invoice')}
            </Link>
          </div>
        ))}
        <div className="small" style={{ padding: '4px 2px' }}>
          <b>{t('total')}</b> · {t('mealDue')} <b className="neg">{money(sum('mealDue'), cur)}</b> · {t('serviceDue')} <b className="neg">{money(sum('serviceDue'), cur)}</b>
        </div>
      </div>
      <div className="table-wrap only-desktop">
        <table>
          <thead>
            <tr>
              <th rowSpan="2">{t('name')}</th>
              <th colSpan="4" className="center grp meal-grp">🍛 {t('mealAccount')}</th>
              <th colSpan="3" className="center grp svc-grp">🧾 {t('serviceAccount')}</th>
              <th rowSpan="2"></th>
            </tr>
            <tr>
              <th className="num">{t('meals')}</th>
              <th className="num">{t('mealCost')}</th>
              <th className="num">{t('mealDeposit')}</th>
              <th className="num">{t('mealBalance')}</th>
              <th className="num">{t('serviceCharge')}</th>
              <th className="num">{t('serviceDeposit')}</th>
              <th className="num">{t('serviceDue')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.memberId}>
                <td>
                  <Link to={`/app/members/${r.memberId}`} className="bold" style={{ color: 'var(--text)' }}>
                    {r.name}
                  </Link>
                </td>
                <td className="num">{num(r.mealCount)}</td>
                <td className="num">{money(r.mealCost, cur)}</td>
                <td className="num">{money(r.mealDeposit, cur)}</td>
                <td className="num bold">{bal(r.mealBalance)}</td>
                <td className="num">{money(r.serviceCharge, cur)}</td>
                <td className="num">{money(r.serviceDeposit, cur)}</td>
                <td className="num bold">{r.serviceDue > 0 ? <span className="badge red">{money(r.serviceDue, cur)}</span> : <span className="badge green">✓</span>}</td>
                <td>
                  <Link className="btn sm" to={`/invoice/${r.memberId}/${month}`}>
                    🧾
                  </Link>
                </td>
              </tr>
            ))}
            <tr>
              <td className="bold">{t('total')}</td>
              <td className="num bold">{num(sum('mealCount'))}</td>
              <td className="num bold">{money(sum('mealCost'), cur)}</td>
              <td className="num bold">{money(sum('mealDeposit'), cur)}</td>
              <td className="num bold neg">{money(sum('mealDue'), cur)}</td>
              <td className="num bold">{money(sum('serviceCharge'), cur)}</td>
              <td className="num bold">{money(sum('serviceDeposit'), cur)}</td>
              <td className="num bold neg">{money(sum('serviceDue'), cur)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
