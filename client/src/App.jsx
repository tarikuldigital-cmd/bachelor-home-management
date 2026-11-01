import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api, getToken, setToken } from './lib/api.js';
import { setLang, getLang } from './lib/i18n.js';
import { ToastProvider, Spinner } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Layout from './pages/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Members from './pages/Members.jsx';
import Profile from './pages/Profile.jsx';
import Meals from './pages/Meals.jsx';
import Bazar from './pages/Bazar.jsx';
import Deposits from './pages/Deposits.jsx';
import Bills from './pages/Bills.jsx';
import Menu from './pages/Menu.jsx';
import Sms from './pages/Sms.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import Invoice from './pages/Invoice.jsx';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);
const PrefCtx = createContext(null);
export const usePrefs = () => useContext(PrefCtx);

function RequireAuth({ children, manager }) {
  const { user, booting } = useAuth();
  if (booting) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (manager && user.role !== 'manager') return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [booting, setBooting] = useState(true);
  const [lang, setLangState] = useState(getLang());
  const [theme, setTheme] = useState(localStorage.getItem('bhm_theme') || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('bhm_theme', theme);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#0a0f0d' : '#f3f7f5');
  }, [theme]);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      const r = await api('me');
      setUser(r.user);
      setSettings(r.settings);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setBooting(false));
    const out = () => setUser(null);
    window.addEventListener('bhm-logout', out);
    return () => window.removeEventListener('bhm-logout', out);
  }, [refresh]);

  const login = async (username, password) => {
    const r = await api('login', { username, password });
    setToken(r.token);
    await refresh();
    return r.user;
  };
  const logout = () => {
    setToken(null);
    setUser(null);
  };
  const changeLang = (l) => {
    setLang(l);
    setLangState(l);
  };

  return (
    <PrefCtx.Provider value={{ lang, setLang: changeLang, theme, setTheme }}>
      <AuthCtx.Provider value={{ user, settings, booting, login, logout, refresh, isManager: user?.role === 'manager' }}>
        <ToastProvider>
          <HashRouter key={lang}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/invoice/:memberId/:month"
                element={
                  <RequireAuth>
                    <Invoice />
                  </RequireAuth>
                }
              />
              <Route
                path="/app"
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="members" element={<Members />} />
                <Route path="members/:id" element={<Profile />} />
                <Route path="profile" element={<Profile />} />
                <Route path="meals" element={<Meals />} />
                <Route path="bazar" element={<Bazar />} />
                <Route path="deposits" element={<RequireAuth manager><Deposits /></RequireAuth>} />
                <Route path="bills" element={<Bills />} />
                <Route path="menu" element={<Menu />} />
                <Route path="sms" element={<RequireAuth manager><Sms /></RequireAuth>} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </AuthCtx.Provider>
    </PrefCtx.Provider>
  );
}
