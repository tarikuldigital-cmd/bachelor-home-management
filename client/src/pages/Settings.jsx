import { useState, useEffect } from 'react';
import { api, DEMO, resetDemo } from '../lib/api.js';
import { t } from '../lib/i18n.js';
import { download } from '../lib/util.js';
import { Field, useApi, useToast } from '../components/ui.jsx';
import { useAuth, usePrefs } from '../App.jsx';

function ChangePassword() {
  const toast = useToast();
  const [f, setF] = useState({ oldPassword: '', newPassword: '' });
  return (
    <div className="card">
      <h3>🔑 {t('changePassword')}</h3>
      <div className="grid g2 mt">
        <Field label={t('oldPassword')}>
          <input className="input" type="password" value={f.oldPassword} onChange={(e) => setF({ ...f, oldPassword: e.target.value })} />
        </Field>
        <Field label={t('newPassword')}>
          <input className="input" type="password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
        </Field>
      </div>
      <button
        className="btn primary mt"
        onClick={async () => {
          try {
            await api('changePassword', f);
            toast(t('saved'));
            setF({ oldPassword: '', newPassword: '' });
          } catch (e) {
            toast(e.message, true);
          }
        }}
      >
        {t('save')}
      </button>
    </div>
  );
}

function MyMealTemplate() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [dm, setDm] = useState(user.defaultMeals || { b: 1, l: 1, d: 1 });
  const [phone, setPhone] = useState(user.phone || '');
  return (
    <div className="card">
      <h3>👤 {t('myProfile')}</h3>
      <div className="grid mt">
        <Field label={`${t('phone')} (SMS)`}>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label={t('defaultMeals')}>
          <div className="row">
            {['b', 'l', 'd'].map((k) => (
              <label key={k} className="row small" style={{ gap: 6 }}>
                {t({ b: 'breakfast', l: 'lunch', d: 'dinner' }[k])}
                <input className="input" style={{ width: 70 }} type="number" min="0" step="0.5" value={dm[k]} onChange={(e) => setDm({ ...dm, [k]: Number(e.target.value) })} />
              </label>
            ))}
          </div>
        </Field>
      </div>
      <button
        className="btn primary mt"
        onClick={async () => {
          try {
            await api('updateMyProfile', { defaultMeals: dm, phone });
            toast(t('saved'));
            refresh();
          } catch (e) {
            toast(e.message, true);
          }
        }}
      >
        {t('save')}
      </button>
    </div>
  );
}

function MessSettings() {
  const toast = useToast();
  const { refresh, user, logout } = useAuth();
  const s = useApi(() => api('getSettings'), []);
  const members = useApi(() => api('listMembers'), []);
  const [f, setF] = useState(null);
  const [to, setTo] = useState('');
  useEffect(() => {
    if (s.data) setF(s.data);
  }, [s.data]);
  if (!f) return null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async () => {
    try {
      await api('saveSettings', { ...f, mealLockHour: Number(f.mealLockHour) });
      toast(t('saved'));
      refresh();
    } catch (e) {
      toast(e.message, true);
    }
  };

  return (
    <>
      <div className="card">
        <h3>🏠 {t('settings')}</h3>
        <div className="grid g2 mt">
          <Field label={t('messName')}>
            <input className="input" value={f.messName} onChange={set('messName')} />
          </Field>
          <Field label={t('messAddress')}>
            <input className="input" value={f.address} onChange={set('address')} />
          </Field>
          <Field label={t('cookName')}>
            <input className="input" value={f.cookName} onChange={set('cookName')} />
          </Field>
          <Field label={t('cookPhone')}>
            <input className="input" value={f.cookPhone} onChange={set('cookPhone')} placeholder="01XXXXXXXXX" />
          </Field>
          <Field label={t('weights')}>
            <div className="row" style={{ gap: 6 }}>
              {['b', 'l', 'd'].map((k) => (
                <input key={k} className="input" style={{ width: 80 }} type="number" step="0.25" min="0" value={f.weights[k]} onChange={(e) => setF({ ...f, weights: { ...f.weights, [k]: e.target.value } })} />
              ))}
            </div>
          </Field>
          <Field label={t('mealLockHour')}>
            <input className="input" type="number" min="0" max="24" value={f.mealLockHour} onChange={set('mealLockHour')} />
          </Field>
        </div>
        <div className="grid mt">
          <b>{t('permissions')}</b>
          <label className="check">
            <input type="checkbox" checked={f.membersCanEditMeals} onChange={set('membersCanEditMeals')} /> {t('membersCanEditMeals')}
          </label>
          <label className="check">
            <input type="checkbox" checked={f.membersCanAddBazar} onChange={set('membersCanAddBazar')} /> {t('membersCanAddBazar')}
          </label>
        </div>
        <h3 className="mt2">✉️ {t('templates')}</h3>
        <div className="grid mt">
          <Field label={`${t('dueReminder')} — {name} {mess} {month} {due} {meal} {service}`}>
            <textarea className="input" value={f.dueSmsTemplate} onChange={set('dueSmsTemplate')} />
          </Field>
          <Field label={`${t('menu')} — {cook} {date} {menu} {meals} {mess}`}>
            <textarea className="input" value={f.menuSmsTemplate} onChange={set('menuSmsTemplate')} />
          </Field>
          <Field label={`${t('bazarDuty')} — {name} {date} {mess}`}>
            <textarea className="input" value={f.dutySmsTemplate} onChange={set('dutySmsTemplate')} />
          </Field>
        </div>
        <button className="btn primary mt" onClick={save}>
          {t('save')}
        </button>
      </div>

      <div className="card">
        <h3>⭐ {t('transferManager')}</h3>
        <div className="row mt">
          <select className="input" style={{ maxWidth: 260 }} value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">—</option>
            {(members.data || [])
              .filter((m) => m.active && m.id !== user.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
          <button
            className="btn danger"
            disabled={!to}
            onClick={async () => {
              if (!confirm(t('transferManager') + '?')) return;
              try {
                await api('transferManager', { memberId: to });
                toast(t('saved'));
                await refresh();
              } catch (e) {
                toast(e.message, true);
              }
            }}
          >
            {t('transferManager')}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>💾 {t('backup')}</h3>
        <div className="row mt">
          <button
            className="btn"
            onClick={async () => {
              const d = await api('exportData');
              download(`bachelor-home-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(d, null, 2));
            }}
          >
            ⬇️ {t('exportJson')}
          </button>
          <label className="btn">
            ⬆️ {t('importJson')}
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !confirm(t('importJson') + '?')) return;
                try {
                  await api('importData', { data: JSON.parse(await file.text()) });
                  toast(t('saved'));
                  logout();
                } catch (x) {
                  toast(x.message, true);
                }
              }}
            />
          </label>
          {DEMO && (
            <button
              className="btn danger"
              onClick={() => {
                if (!confirm(t('resetDemo') + '?')) return;
                resetDemo();
                location.reload();
              }}
            >
              ♻️ {t('resetDemo')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default function Settings() {
  const { isManager } = useAuth();
  const { lang, setLang, theme, setTheme } = usePrefs();
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="row between">
          <div className="row">
            <b>{t('language')}:</b>
            <div className="tabs">
              <button className={lang === 'bn' ? 'on' : ''} onClick={() => setLang('bn')}>
                বাংলা
              </button>
              <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
                English
              </button>
            </div>
          </div>
          <div className="row">
            <b>{t('theme')}:</b>
            <div className="tabs">
              <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}>
                🌙 {t('dark')}
              </button>
              <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>
                ☀️ {t('light')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="grid g2">
        <MyMealTemplate />
        <ChangePassword />
      </div>
      {isManager && <MessSettings />}
    </div>
  );
}
