import { Link } from 'react-router-dom';
import { t, n2 } from '../lib/i18n.js';
import { money, num, dateLabel, monthLabel } from '../lib/util.js';
import { Stat, Balance, Empty, Avatar } from './ui.jsx';

// Personal account block — only shown after login (member sees own, manager sees anyone)
export function DueAlert({ stats, cur, month }) {
  if (!stats) return null;
  if (stats.due > 0)
    return (
      <div className="alert red">
        <span style={{ fontSize: 26 }}>⚠️</span>
        <div className="grow">
          <div className="bold">{t('dueAlert')}</div>
          <div className="small">
            {t('dueAlertText')} ({monthLabel(month)}): <b className="neg">{money(stats.due, cur)}</b>
            {stats.mealBalance < 0 && (
              <>
                {' '}
                · {t('meals')}: {money(-stats.mealBalance, cur)}
              </>
            )}
            {stats.serviceBalance < 0 && (
              <>
                {' '}
                · {t('serviceCharge')}: {money(-stats.serviceBalance, cur)}
              </>
            )}
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

export function AccountStats({ d, cur }) {
  const s = d.stats;
  if (!s) return <Empty />;
  return (
    <>
      <div className="grid g4">
        <Stat label={t('myMeals')} value={num(s.mealCount)} sub={`${t('mealRate')}: ${money(d.summary.mealRate, cur)}`} ico="🍛" />
        <Stat label={t('mealCost')} value={money(s.mealCost, cur)} sub={`${num(s.mealCount)} × ${money(d.summary.mealRate, cur)}`} ico="🧮" />
        <Stat label={t('totalDeposit')} value={money(s.totalDeposit, cur)} sub={`${t('mealDep')} ${money(s.mealDeposit, cur)} · ${t('serviceDep')} ${money(s.serviceDeposit, cur)}`} ico="💰" />
        <Stat
          hl
          danger={s.net < 0}
          label={s.net >= 0 ? t('willGet') : t('willPay')}
          value={money(Math.abs(s.net), cur)}
          sub={t('netBalance')}
          ico={s.net >= 0 ? '🎉' : '⏳'}
        />
      </div>

      <div className="grid g2 mt">
        <div className="card">
          <div className="card-head">
            <h3>🍛 {t('mealBalance')}</h3>
          </div>
          <div className="kv">
            <span className="k">{t('myMeals')}</span>
            <span>{num(s.mealCount)}</span>
            <span className="k">{t('mealRate')}</span>
            <span>{money(d.summary.mealRate, cur)}</span>
            <span className="k">{t('mealCost')}</span>
            <span>{money(s.mealCost, cur)}</span>
            <span className="k">{t('mealDeposit')}</span>
            <span>{money(s.mealDeposit, cur)}</span>
            <span className="k">{t('bazarSpent')}</span>
            <span>{money(s.bazarSpent, cur)}</span>
            <span className="k bold">{t('mealBalance')}</span>
            <span className="bold">
              <Balance value={s.mealBalance} cur={cur} />
            </span>
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h3>🧾 {t('serviceCharge')}</h3>
            <span className="badge blue">🔒 {t('member')} + {t('manager')}</span>
          </div>
          {d.bills.length ? (
            <div className="kv">
              {d.bills.map((b) => (
                <FragmentRow key={b.id} k={t(b.type)} v={`${money(b.share, cur)}`} sub={`${money(b.amount, cur)} ÷ ${n2(b.splitCount)}`} />
              ))}
              <span className="k bold">{t('serviceCharge')}</span>
              <span className="bold">{money(s.serviceCharge, cur)}</span>
              <span className="k">{t('serviceDeposit')}</span>
              <span>{money(s.serviceDeposit, cur)}</span>
              <span className="k bold">{t('serviceBalance')}</span>
              <span className="bold">
                <Balance value={s.serviceBalance} cur={cur} />
              </span>
            </div>
          ) : (
            <Empty />
          )}
        </div>
      </div>
    </>
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
              {r.due > 0 ? <span className="badge red">{money(r.due, cur)}</span> : <span className="badge green">✓</span>}
            </div>
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
                <div className="k">{t('totalDeposit')}</div>
                <div className="v">{money(r.totalDeposit, cur)}</div>
              </div>
              <div>
                <div className="k">{t('serviceCharge')}</div>
                <div className="v">{money(r.serviceCharge, cur)}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div className="k">{t('netBalance')}</div>
                <div className={`v ${r.net >= 0 ? 'pos' : 'neg'}`}>
                  {money(Math.abs(r.net), cur)} <span className="tiny">({r.net >= 0 ? t('willGet') : t('willPay')})</span>
                </div>
              </div>
            </div>
            <Link className="btn sm mt block" to={`/invoice/${r.memberId}/${month}`}>
              🧾 {t('invoice')}
            </Link>
          </div>
        ))}
        <div className="row between small" style={{ padding: '4px 2px' }}>
          <b>{t('total')}</b>
          <span>
            {t('meals')} {num(sum('mealCount'))} · {t('due')} <b className="neg">{money(sum('due'), cur)}</b>
          </span>
        </div>
      </div>
    <div className="table-wrap only-desktop">
      <table>
        <thead>
          <tr>
            <th>{t('name')}</th>
            <th className="num">{t('meals')}</th>
            <th className="num">{t('mealCost')}</th>
            <th className="num">{t('mealDeposit')}</th>
            <th className="num">{t('serviceCharge')}</th>
            <th className="num">{t('serviceDeposit')}</th>
            <th className="num">{t('netBalance')}</th>
            <th className="num">{t('due')}</th>
            <th></th>
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
              <td className="num">{money(r.serviceCharge, cur)}</td>
              <td className="num">{money(r.serviceDeposit, cur)}</td>
              <td className={`num bold ${r.net >= 0 ? 'pos' : 'neg'}`}>{money(r.net, cur)}</td>
              <td className="num">{r.due > 0 ? <span className="badge red">{money(r.due, cur)}</span> : <span className="badge green">✓</span>}</td>
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
            <td className="num bold">{money(sum('serviceCharge'), cur)}</td>
            <td className="num bold">{money(sum('serviceDeposit'), cur)}</td>
            <td className="num bold">{money(sum('net'), cur)}</td>
            <td className="num bold">{money(sum('due'), cur)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
    </>
  );
}
