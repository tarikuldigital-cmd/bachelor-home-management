import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { t, n2 } from '../lib/i18n.js';
import { money, num, monthLabel, dateLabel } from '../lib/util.js';
import { Spinner, useApi, Logo } from '../components/ui.jsx';
import { useAuth } from '../App.jsx';

export default function Invoice() {
  const { memberId, month } = useParams();
  const nav = useNavigate();
  const { settings } = useAuth();
  const cur = settings?.currency || '৳';
  const { data: d, error } = useApi(() => api('memberDetail', { memberId, month }), [memberId, month]);
  if (error) return <div className="container alert red mt">{error.message}</div>;
  if (!d) return <Spinner />;
  const s = d.stats || {};
  const m = d.member;
  const row = (k, v, bold) => (
    <tr>
      <td className={bold ? 'bold' : ''}>{k}</td>
      <td className={`num ${bold ? 'bold' : ''}`}>{v}</td>
    </tr>
  );

  return (
    <div style={{ padding: 12 }}>
      <div className="no-print row" style={{ maxWidth: 800, margin: '0 auto', justifyContent: 'space-between' }}>
        <button className="btn" onClick={() => nav(-1)}>
          ← {t('cancel')}
        </button>
        <button className="btn primary" onClick={() => window.print()}>
          🖨️ {t('print')}
        </button>
      </div>
      <div className="invoice">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="row">
            <Logo size={52} />
            <div>
              <h2 style={{ fontSize: 20 }}>{settings?.messName}</h2>
              <div className="muted small">{settings?.address}</div>
            </div>
          </div>
          <div className="right">
            <div style={{ fontSize: 22, fontWeight: 800, color: '#047857' }}>{t('invoice').toUpperCase()}</div>
            <div className="small">{monthLabel(month)}</div>
          </div>
        </div>
        <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />
        <div className="row between">
          <div>
            <div className="muted small">{t('member')}</div>
            <div className="bold" style={{ fontSize: 17 }}>{m.name}</div>
            <div className="small">
              {m.phone} {m.room ? `· ${t('room')} ${n2(m.room)}` : ''}
            </div>
          </div>
          <div className="right">
            <div className="muted small">{t('mealRate')}</div>
            <div className="bold">{money(d.summary.mealRate, cur)}</div>
            <div className="tiny muted">
              {money(d.summary.totalBazar, cur)} ÷ {num(d.summary.totalMeals)}
            </div>
          </div>
        </div>
        <table style={{ marginTop: 20 }}>
          <tbody>
            {row(`${t('myMeals')} (${num(s.mealCount)} × ${money(d.summary.mealRate, cur)})`, money(s.mealCost, cur))}
            {d.bills.map((b) => (
              <tr key={b.id}>
                <td>
                  {t(b.type)} <span className="muted tiny">({money(b.amount, cur)} ÷ {n2(b.splitCount)})</span>
                </td>
                <td className="num">{money(b.share, cur)}</td>
              </tr>
            ))}
            {row(t('total'), money((s.mealCost || 0) + (s.serviceCharge || 0), cur), true)}
            {row(t('mealDeposit'), `− ${money(s.mealDeposit, cur)}`)}
            {row(t('serviceDeposit'), `− ${money(s.serviceDeposit, cur)}`)}
            {row(s.net >= 0 ? t('willGet') : t('willPay'), money(Math.abs(s.net || 0), cur), true)}
          </tbody>
        </table>
        {d.deposits.length > 0 && (
          <>
            <h4 style={{ marginTop: 24 }}>{t('deposits')}</h4>
            <table>
              <tbody>
                {d.deposits.map((x) => (
                  <tr key={x.id}>
                    <td>{dateLabel(x.date)}</td>
                    <td>{x.type === 'service' ? t('serviceDep') : t('mealDep')}</td>
                    <td className="muted">{x.note}</td>
                    <td className="num">{money(x.amount, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <div className="muted tiny center" style={{ marginTop: 30 }}>
          Bachelor Home Management · {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
