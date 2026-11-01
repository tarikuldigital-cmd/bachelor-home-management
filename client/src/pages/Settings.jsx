import { useState, useEffect } from 'react';
import { api, DEMO, resetDemo } from '../lib/api.js';
import { t } from '../lib/i18n.js';
import { download } from '../lib/util.js';
import { mealSlots, SLOT_KEY, DEFAULT_RULES } from '../lib/engine.js';
import { Field, useApi, useToast } from '../components/ui.jsx';
import { HandoverCard } from '../components/Handover.jsx';
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
  const [phone, setPhone] = useState(user.phone || '');
  return (
    <div className="card">
      <h3>👤 {t('myProfile')}</h3>
      <div className="grid mt">
        <Field label={`${t('phone')} (SMS)`}>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </div>
      <button
        className="btn primary mt"
        onClick={async () => {
          try {
            await api('updateMyProfile', { phone });
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
  const { refresh, logout } = useAuth();
  const s = useApi(() => api('getSettings'), []);
  const [f, setF] = useState(null);
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
              {mealSlots(f).map((k) => (
                <input key={k} title={t(SLOT_KEY[k])} className="input" style={{ width: 80 }} type="number" step="0.25" min="0" value={f.weights[k]} onChange={(e) => setF({ ...f, weights: { ...f.weights, [k]: e.target.value } })} />
              ))}
            </div>
          </Field>
        </div>
        <div className="grid mt">
          <b>🍽️ {t('mealsPerDay')}</b>
          <div className="tabs" style={{ width: 'fit-content' }}>
            <button type="button" className={!f.breakfastEnabled ? 'on' : ''} onClick={() => setF({ ...f, breakfastEnabled: false })}>
              {t('twoMeals')}
            </button>
            <button type="button" className={f.breakfastEnabled ? 'on' : ''} onClick={() => setF({ ...f, breakfastEnabled: true })}>
              {t('threeMeals')}
            </button>
          </div>
          <div className="alert green small">🔒 {t('managerOnlyCharges')}</div>
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
        <div className="card-head">
          <h3>📜 {t('messRules')}</h3>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn sm" onClick={() => setF({ ...f, rules: DEFAULT_RULES })}>
              ↺ {t('resetRules')}
            </button>
            <button className="btn sm primary" onClick={() => setF({ ...f, rules: [...(f.rules || []), { en: '', bn: '' }] })}>
              ＋ {t('addRule')}
            </button>
          </div>
        </div>
        <div className="grid" style={{ gap: 10 }}>
          {(f.rules || []).map((r, i) => (
            <div key={i} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <span className="badge amber" style={{ marginTop: 8 }}>
                {i + 1}
              </span>
              <div className="grid grow" style={{ gap: 6 }}>
                <input className="input" placeholder="English" value={r.en} onChange={(e) => setF({ ...f, rules: f.rules.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)) })} />
                <input className="input" placeholder="বাংলা" value={r.bn} onChange={(e) => setF({ ...f, rules: f.rules.map((x, j) => (j === i ? { ...x, bn: e.target.value } : x)) })} />
              </div>
              <button className="btn sm ghost danger" style={{ marginTop: 4 }} onClick={() => setF({ ...f, rules: f.rules.filter((_, j) => j !== i) })}>
                🗑
              </button>
            </div>
          ))}
        </div>
        <button className="btn primary mt" onClick={save}>
          {t('save')}
        </button>
      </div>

      <HandoverCard />

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
      {isManager ? <MessSettings /> : <HandoverCard />}
    </div>
  );
}
