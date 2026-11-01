import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { t } from '../lib/i18n.js';
import { Logo, Field } from '../components/ui.jsx';
import { useAuth } from '../App.jsx';
import { PrefButtons } from './Home.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/app" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(u, p);
      nav('/app');
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="row between mb">
          <Link to="/" className="btn ghost sm">
            ← {t('home')}
          </Link>
          <div className="row" style={{ gap: 4 }}>
            <PrefButtons />
          </div>
        </div>
        <div className="card" style={{ padding: 26 }}>
          <div className="center">
            <Logo size={64} />
            <h2 style={{ marginTop: 12, fontSize: 21 }}>{t('appName')}</h2>
            <p className="muted small" style={{ margin: '4px 0 0' }}>
              {t('tagline')}
            </p>
          </div>
          <form onSubmit={submit} className="grid mt2">
            <Field label={t('username')}>
              <input className="input" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required autoFocus />
            </Field>
            <Field label={t('password')}>
              <input className="input" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required />
            </Field>
            {err && <div className="alert red small">{err}</div>}
            <button className="btn primary block" disabled={busy} style={{ padding: 12 }}>
              {busy ? '...' : `🔐 ${t('login')}`}
            </button>
          </form>
        </div>
        <div className="login-credit">
          {t('designedBy')} <b>Tariqul Islam</b>
        </div>
      </div>
    </div>
  );
}
