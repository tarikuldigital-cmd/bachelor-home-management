import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { api, DEMO } from '../lib/api.js';
import { t, n2 } from '../lib/i18n.js';
import { Brand, Avatar } from '../components/ui.jsx';
import { useAuth } from '../App.jsx';
import { PrefButtons } from './Home.jsx';
import { RulesTicker } from '../components/RulesTicker.jsx';

export function navItems(isManager) {
  return [
    { to: '/app', ico: '📊', label: t('dashboard'), end: true },
    { to: '/app/profile', ico: '👤', label: t('myProfile') },
    { to: '/app/members', ico: '👥', label: t('members') },
    { to: '/app/meals', ico: '🍛', label: t('meals') },
    { to: '/app/bazar', ico: '🛒', label: t('bazar') },
    isManager && { to: '/app/deposits', ico: '💰', label: t('deposits') },
    { to: '/app/bills', ico: '🧾', label: t('bills') },
    { to: '/app/menu', ico: '👨‍🍳', label: t('menu') },
    isManager && { to: '/app/sms', ico: '✉️', label: t('sms') },
    { to: '/app/notifications', ico: '🔔', label: t('notifications'), badge: true },
    { to: '/app/settings', ico: '⚙️', label: t('settings') },
  ].filter(Boolean);
}

function titleFor(path, items) {
  const hit = [...items].sort((a, b) => b.to.length - a.to.length).find((i) => (i.end ? path === i.to : path.startsWith(i.to)));
  return hit ? hit.label : t('dashboard');
}

export default function Layout() {
  const { user, settings, logout, isManager } = useAuth();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const items = navItems(isManager);

  useEffect(() => {
    let live = true;
    const load = () =>
      api('notifications')
        .then((l) => live && setUnread(l.filter((n) => !n.read).length))
        .catch(() => {});
    load();
    const iv = setInterval(load, 30000);
    return () => {
      live = false;
      clearInterval(iv);
    };
  }, [loc.pathname]);

  useEffect(() => setDrawer(false), [loc.pathname]);

  const link = (i) => (
    <NavLink key={i.to} to={i.to} end={i.end}>
      <span className="ico">{i.ico}</span>
      {i.label}
      {i.badge && unread > 0 && <span className="count">{n2(unread)}</span>}
    </NavLink>
  );

  const bottom = [items[0], items.find((i) => i.to === '/app/meals'), items.find((i) => i.to === '/app/bazar'), items.find((i) => i.to === '/app/profile')];

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/">
          <Brand name={settings?.messName} />
        </Link>
        <nav className="nav">{items.map(link)}</nav>
        <div style={{ height: 16 }} />
        <div className="user-chip">
          <Avatar src={user.photo} name={user.name} size={38} />
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="bold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div className="tiny muted">{user.role === 'manager' ? t('manager') : t('member')}</div>
          </div>
          <button className="btn ghost sm" onClick={logout} title={t('logout')}>
            ⎋
          </button>
        </div>
      </aside>

      <div className="main">
          <div className="main-head">
          <div className="inner">
            <h2 className="grow">{titleFor(loc.pathname, items)}</h2>
            <Link to="/" className="btn ghost icon-btn" title={t('home')}>
              🏠
            </Link>
            <Link to="/app/notifications" className="btn ghost icon-btn" style={{ position: 'relative' }}>
              🔔
              {unread > 0 && (
                <span className="count" style={{ position: 'absolute', top: 2, right: 2, background: 'var(--danger)', color: '#fff', fontSize: 10, borderRadius: 99, padding: '0 5px' }}>
                  {n2(unread)}
                </span>
              )}
            </Link>
            <PrefButtons />
          </div>
          <RulesTicker path={loc.pathname} />
        </div>
        <div className="page">
          <Outlet />
        </div>
      </div>

      <nav className="bottom-nav">
        {bottom.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end}>
            <span className="ico">{i.ico}</span>
            {i.label}
          </NavLink>
        ))}
        <button onClick={() => setDrawer(true)}>
          <span className="ico">☰</span>
          {t('more')}
        </button>
      </nav>

      {drawer && (
        <>
          <div className="drawer-bg" onClick={() => setDrawer(false)} />
          <div className="drawer">
            <div className="row" style={{ padding: '4px 6px 10px' }}>
              <Avatar src={user.photo} name={user.name} size={40} />
              <div className="grow">
                <div className="bold">{user.name}</div>
                <div className="tiny muted">{user.role === 'manager' ? t('manager') : t('member')}</div>
              </div>
              <button className="btn sm danger" onClick={logout}>
                {t('logout')}
              </button>
            </div>
            <nav className="nav">{items.map(link)}</nav>
          </div>
        </>
      )}
    </div>
  );
}
