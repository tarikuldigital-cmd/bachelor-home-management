import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, DEMO } from '../lib/api.js';
import { t, n2 } from '../lib/i18n.js';
import { money, num, monthLabel, dateLabel } from '../lib/util.js';
import { monthOf, todayStr } from '../lib/engine.js';
import { Brand, Stat, MonthPicker, Bars, Empty, Spinner, useApi } from '../components/ui.jsx';
import { useAuth, usePrefs } from '../App.jsx';

export function MenuCard({ title, menu, badge }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3>🍽️ {title}</h3>
        {badge}
      </div>
      {menu ? (
        <div className="menu-box">
          {menu.breakfast && (
            <div className="menu-line">
              <span className="k">{t('breakfast')}</span>
              <span>{menu.breakfast}</span>
            </div>
          )}
          {menu.lunch && (
            <div className="menu-line">
              <span className="k">{t('lunch')}</span>
              <span>{menu.lunch}</span>
            </div>
          )}
          {menu.dinner && (
            <div className="menu-line">
              <span className="k">{t('dinner')}</span>
              <span>{menu.dinner}</span>
            </div>
          )}
          {menu.note && (
            <div className="menu-line">
              <span className="k">{t('note')}</span>
              <span className="muted">{menu.note}</span>
            </div>
          )}
        </div>
      ) : (
        <Empty text={t('noMenu')} />
      )}
    </div>
  );
}

export function PrefButtons() {
  const { lang, setLang, theme, setTheme } = usePrefs();
  return (
    <>
      <button className="btn ghost icon-btn" title={t('language')} onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}>
        {lang === 'bn' ? 'EN' : 'বাং'}
      </button>
      <button className="btn ghost icon-btn" title={t('theme')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthOf(todayStr()));
  const { data, loading } = useApi(() => api('publicSummary', { month }), [month]);

  return (
    <>
      {DEMO && <div className="demo-banner">{t('demoBanner')}</div>}
      <header className="topbar">
        <div className="container inner">
          <Link to="/">
            <Brand name={data?.messName} />
          </Link>
          <div className="row" style={{ gap: 6 }}>
            <PrefButtons />
            {user ? (
              <Link className="btn primary" to="/app">
                {t('dashboard')} →
              </Link>
            ) : (
              <Link className="btn primary" to="/login">
                🔐 {t('login')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        {loading && !data ? (
          <Spinner />
        ) : (
          <>
            <section className="hero">
              <div className="row between" style={{ alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div>
                  <div className="small" style={{ opacity: 0.85 }}>
                    🏠 {data.messName}
                    {data.address ? ` · ${data.address}` : ''}
                  </div>
                  <h1 style={{ marginTop: 6 }}>{monthLabel(month)}</h1>
                  <p>{t('tagline')}</p>
                </div>
                <div className="right">
                  <div className="small" style={{ opacity: 0.85 }}>{t('runningMealRate')}</div>
                  <div className="rate">{money(data.mealRate, data.currency)}</div>
                  <div className="tiny" style={{ opacity: 0.75 }}>{t('howRate')}</div>
                </div>
              </div>
            </section>

            <div className="row between mt">
              <h3>📊 {t('month')}</h3>
              <MonthPicker value={month} months={data.months} onChange={setMonth} />
            </div>

            <div className="grid g4 mt">
              <Stat label={t('totalMeals')} value={num(data.totalMeals)} ico="🍛" />
              <Stat label={t('totalBazar')} value={money(data.totalBazar, data.currency)} ico="🛒" />
              <Stat label={t('mealRate')} value={money(data.mealRate, data.currency)} ico="📈" hl />
              <Stat label={t('memberCount')} value={n2(data.memberCount)} ico="👥" />
            </div>

            <div className="grid g2 mt">
              <MenuCard title={t('todayMenu')} menu={data.todayMenu} />
              <MenuCard title={t('tomorrowMenu')} menu={data.tomorrowMenu} />
            </div>

            <div className="grid g2 mt">
              <div className="card">
                <div className="card-head">
                  <h3>📅 {t('dailyMeals')}</h3>
                </div>
                <Bars data={data.daily} />
              </div>
              <div className="card">
                <div className="card-head">
                  <h3>🧺 {t('upcomingDuty')}</h3>
                </div>
                {data.duties.length ? (
                  data.duties.map((d) => (
                    <div className="list-item" key={d.date}>
                      <span className="badge green">{dateLabel(d.date)}</span>
                      <span>{d.name}</span>
                    </div>
                  ))
                ) : (
                  <Empty />
                )}
              </div>
            </div>

            <div className="card mt">
              <div className="card-head">
                <h3>🛒 {t('recentBazar')}</h3>
                <span className="badge">
                  {t('total')}: {money(data.totalBazar, data.currency)}
                </span>
              </div>
              {data.bazar.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('date')}</th>
                        <th>{t('items')}</th>
                        <th>{t('by')}</th>
                        <th className="num">{t('amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bazar.map((b) => (
                        <tr key={b.id}>
                          <td>{dateLabel(b.date)}</td>
                          <td>{b.items}</td>
                          <td className="muted">{b.by}</td>
                          <td className="num">{money(b.amount, data.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty />
              )}
            </div>

            <div className="alert green mt">
              <span style={{ fontSize: 22 }}>🔒</span>
              <div className="grow">{t('privateNote')}</div>
              <Link className="btn primary" to={user ? '/app' : '/login'}>
                {user ? t('goDashboard') : t('login')}
              </Link>
            </div>
          </>
        )}
        <footer className="foot">© {new Date().getFullYear()} Bachelor Home Management</footer>
      </main>
    </>
  );
}
