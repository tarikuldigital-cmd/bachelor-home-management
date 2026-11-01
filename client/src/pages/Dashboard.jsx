import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { t, n2 } from '../lib/i18n.js';
import { money, num, dateLabel } from '../lib/util.js';
import { monthOf, todayStr } from '../lib/engine.js';
import { Stat, MonthPicker, Bars, Spinner, useApi, Avatar, Empty, useToast } from '../components/ui.jsx';
import { AccountStats, DueAlert, MembersTable } from '../components/Account.jsx';
import { useAuth } from '../App.jsx';
import { TrendCard } from '../components/Trend.jsx';
import { MenuCard } from './Home.jsx';

// Archived month = only mess totals are public. Manager can load the full per-member ledger.
function ArchiveNotice({ isManager }) {
  const { logout, login, user } = useAuth();
  const toast = useToast();
  return (
    <div className="alert amber">
      <span style={{ fontSize: 24 }}>📒</span>
      <div className="grow small">
        <b>{t('archivedTitle')}</b>
        <div>{isManager ? t('archivedManager') : t('archivedMember')}</div>
      </div>
      {isManager && (
        <label className="btn primary">
          ⬆️ {t('loadLedger')}
          <input
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const data = JSON.parse(await file.text());
                await api('importData', { data });
                toast(`✓ ${t('ledgerLoaded')}`);
                try {
                  await login(user.username, '1234');
                  location.reload();
                } catch {
                  logout();
                }
              } catch (x) {
                toast(x.message, true);
              }
            }}
          />
        </label>
      )}
    </div>
  );
}

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

      {pub.data.archived ? <ArchiveNotice isManager={isManager} /> : <DueAlert stats={d.stats} cur={cur} month={month} />}

      <TrendCard month={month} cur={cur} />

      {!pub.data.archived && <AccountStats d={d} cur={cur} />}

      {pub.data.archived && (
        <div className="grid g4">
          <Stat label={t('totalMeals')} value={num(pub.data.totalMeals)} ico="🍛" />
          <Stat label={t('totalBazar')} value={money(pub.data.totalBazar, cur)} ico="🛒" />
          <Stat label={t('mealRate')} value={money(pub.data.mealRate, cur)} ico="📈" hl />
          <Stat label={t('memberCount')} value={n2(pub.data.memberCount)} ico="👥" />
        </div>
      )}

      {isManager && o && !o.archived && (
        <>
          <h3 className="mt">🏠 {t('manager')} — {t('allMembersAccount')}</h3>
          <div className="grid g4">
            <Stat label={t('totalMeals')} value={num(o.totalMeals)} ico="🍛" />
            <Stat label={t('totalBazar')} value={money(o.totalBazar, cur)} ico="🛒" />
            <Stat label={t('totalBills')} value={money(o.totalBills, cur)} sub={`${t('totalServicePaid')}: ${money(o.totalServicePaid, cur)} · ${t('serviceDue')}: ${money(o.rows.reduce((s, r) => s + r.serviceDue, 0), cur)}`} ico="🧾" />
            <Stat label={t('totalDeposit')} value={money(o.totalDeposit, cur)} sub={`${t('mealDue')}: ${money(o.rows.reduce((s, r) => s + r.mealDue, 0), cur)}`} ico="💰" />
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
