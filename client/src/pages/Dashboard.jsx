import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { t, n2 } from '../lib/i18n.js';
import { money, num, dateLabel } from '../lib/util.js';
import { monthOf, todayStr } from '../lib/engine.js';
import { Stat, MonthPicker, Bars, Spinner, useApi, Avatar, Empty } from '../components/ui.jsx';
import { AccountStats, DueAlert, MembersTable } from '../components/Account.jsx';
import { useAuth } from '../App.jsx';
import { TrendCard } from '../components/Trend.jsx';
import { MenuCard } from './Home.jsx';

export default function Dashboard() {
  const { user, settings, isManager } = useAuth();
  const cur = settings?.currency || '৳';
  const [sel, setMonth] = useState('');
  const q = sel ? { month: sel } : {};
  const mine = useApi(() => api('memberDetail', q), [sel]);
  const pub = useApi(() => api('publicSummary', q), [sel]);
  const ov = useApi(() => (isManager ? api('overview', q) : Promise.resolve(null)), [sel, isManager]);
  const month = mine.data?.month || sel || monthOf(todayStr());

  if (!mine.data || !pub.data) return <Spinner />;
  const d = mine.data;
  const o = ov.data;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between">
        <div className="row">
          <Avatar src={user.photo} name={user.name} size={46} />
          <div>
            <div className="muted small">{t('welcome')} 👋</div>
            <h3 style={{ fontSize: 19 }}>{user.name}</h3>
          </div>
        </div>
        <MonthPicker value={month} months={d.months} onChange={setMonth} />
      </div>

      <DueAlert stats={d.stats} cur={cur} month={month} />

      <TrendCard month={month} cur={cur} />

      <AccountStats d={d} cur={cur} />

      {isManager && o && (
        <>
          <h3 className="mt">🏠 {t('manager')} — {t('allMembersAccount')}</h3>
          <div className="grid g4">
            <Stat label={t('totalMeals')} value={num(o.totalMeals)} ico="🍛" />
            <Stat label={t('totalBazar')} value={money(o.totalBazar, cur)} ico="🛒" />
            <Stat label={t('totalBills')} value={money(o.totalBills, cur)} sub={`${t('perHead')}: ${money(o.memberCount ? o.totalBills / o.memberCount : 0, cur)}`} ico="🧾" />
            <Stat label={t('totalDeposit')} value={money(o.totalDeposit, cur)} sub={`${t('due')}: ${money(o.rows.reduce((s, r) => s + r.due, 0), cur)}`} ico="💰" />
          </div>
          <div className="card">
            <div className="card-head">
              <h3>👥 {t('allMembersAccount')}</h3>
              <Link className="btn sm" to="/app/sms">
                ✉️ {t('dueReminder')}
              </Link>
            </div>
            <MembersTable rows={o.rows} cur={cur} month={month} />
          </div>
        </>
      )}

      <div className="grid g2">
        <MenuCard title={t('todayMenu')} menu={pub.data.todayMenu} />
        <MenuCard title={t('tomorrowMenu')} menu={pub.data.tomorrowMenu} />
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="card-head">
            <h3>📅 {t('dailyMeals')}</h3>
            <span className="badge green">
              {t('mealRate')}: {money(pub.data.mealRate, cur)}
            </span>
          </div>
          <Bars data={pub.data.daily} />
        </div>
        <div className="card">
          <div className="card-head">
            <h3>🧺 {t('upcomingDuty')}</h3>
          </div>
          {d.duties.length > 0 && (
            <div className="alert amber small mb">
              🧺 {t('bazarDuty')}: <b>{d.duties.map((x) => dateLabel(x.date)).join(', ')}</b>
            </div>
          )}
          {pub.data.duties.map((x) => (
            <div className="list-item" key={x.date}>
              <span className="badge green">{dateLabel(x.date)}</span>
              <span>{x.name}</span>
            </div>
          ))}
          {!pub.data.duties.length && <Empty />}
        </div>
      </div>
    </div>
  );
}
