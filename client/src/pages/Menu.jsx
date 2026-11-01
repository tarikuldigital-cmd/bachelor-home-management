import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, DEMO } from '../lib/api.js';
import { t } from '../lib/i18n.js';
import { dateLabel, smsLink, timeAgo } from '../lib/util.js';
import { todayStr, addDays } from '../lib/engine.js';
import { Modal, Field, Spinner, useApi, useToast, Empty } from '../components/ui.jsx';
import { useAuth } from '../App.jsx';
import { MenuCard } from './Home.jsx';

export default function Menu() {
  const { isManager } = useAuth();
  const toast = useToast();
  const list = useApi(() => api('listMenus', { from: addDays(todayStr(), -14) }), []);
  const settings = useApi(() => (isManager ? api('getSettings') : Promise.resolve(null)), [isManager]);
  const [form, setForm] = useState(null);
  const [preview, setPreview] = useState(null);
  const tomorrow = addDays(todayStr(), 1);

  const save = async (andSend) => {
    try {
      await api('saveMenu', form);
      toast(t('saved'));
      const date = form.date;
      setForm(null);
      list.reload();
      if (andSend) openPreview(date);
    } catch (e) {
      toast(e.message, true);
    }
  };
  const openPreview = async (date) => {
    try {
      setPreview({ date, ...(await api('menuSmsPreview', { date })) });
    } catch (e) {
      toast(e.message, true);
    }
  };
  const send = async () => {
    try {
      const r = await api('sendMenuToCook', { date: preview.date, message: preview.message });
      if (r.ok) toast(`✓ ${t('sent')}`);
      else if (DEMO) {
        window.open(smsLink(preview.number, preview.message));
        toast(t('demoSms'));
      } else toast(`${t('failed')}: ${r.info}`, true);
      setPreview(null);
      list.reload();
    } catch (e) {
      toast(e.message, true);
    }
  };

  if (list.loading && !list.data) return <Spinner />;
  const menus = list.data || [];
  const tMenu = menus.find((m) => m.date === tomorrow);
  const todayMenu = menus.find((m) => m.date === todayStr());
  const s = settings.data;

  return (
    <div className="grid" style={{ gap: 16 }}>
      {isManager && (
        <div className="card">
          <div className="row between">
            <div>
              <h3>👨‍🍳 {t('cookInfo')}</h3>
              <div className="small muted mt">
                {s?.cookName || '—'} · {s?.cookPhone || '—'}{' '}
                <Link to="/app/settings" className="small">
                  ({t('edit')})
                </Link>
              </div>
            </div>
            <div className="row">
              <button className="btn primary" onClick={() => setForm(tMenu ? { ...tMenu } : { date: tomorrow, breakfast: '', lunch: '', dinner: '', note: '' })}>
                ＋ {t('tomorrowMenu')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid g2">
        <MenuCard title={t('todayMenu')} menu={todayMenu} />
        <MenuCard
          title={t('tomorrowMenu')}
          menu={tMenu}
          badge={
            isManager && tMenu ? (
              <button className="btn sm primary" onClick={() => openPreview(tomorrow)}>
                ✉️ {t('sendToCook')}
              </button>
            ) : null
          }
        />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>📜 {t('history')}</h3>
        </div>
        {menus.length ? (
          menus.map((m) => (
            <div className="list-item" key={m.id} style={{ alignItems: 'flex-start' }}>
              <span className="badge green">{dateLabel(m.date)}</span>
              <div className="grow small">
                {m.breakfast && (
                  <div>
                    <b>{t('breakfast')}:</b> {m.breakfast}
                  </div>
                )}
                {m.lunch && (
                  <div>
                    <b>{t('lunch')}:</b> {m.lunch}
                  </div>
                )}
                {m.dinner && (
                  <div>
                    <b>{t('dinner')}:</b> {m.dinner}
                  </div>
                )}
                {m.note && <div className="muted">{m.note}</div>}
                {m.sentAt && (
                  <div className="tiny muted">
                    ✉️ {timeAgo(m.sentAt)} {m.sentOk ? '✓' : ''}
                  </div>
                )}
              </div>
              {isManager && (
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn sm" onClick={() => openPreview(m.date)}>
                    ✉️
                  </button>
                  <button className="btn sm ghost" onClick={() => setForm({ ...m })}>
                    ✏️
                  </button>
                  <button
                    className="btn sm ghost danger"
                    onClick={async () => {
                      if (!confirm(t('confirmDelete'))) return;
                      await api('deleteMenu', { id: m.id });
                      list.reload();
                    }}
                  >
                    🗑
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <Empty />
        )}
      </div>

      {form && (
        <Modal
          title={`👨‍🍳 ${t('menu')}`}
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn" onClick={() => save(false)}>
                {t('save')}
              </button>
              <button className="btn primary" onClick={() => save(true)}>
                {t('save')} + ✉️ {t('sendToCook')}
              </button>
            </>
          }
        >
          <div className="grid">
            <Field label={t('date')}>
              <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            {['breakfast', 'lunch', 'dinner'].map((k) => (
              <Field key={k} label={t(k)}>
                <input className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </Field>
            ))}
            <Field label={t('note')}>
              <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Less spicy, 2 guests..." />
            </Field>
          </div>
        </Modal>
      )}

      {preview && (
        <Modal
          title={`✉️ ${t('smsPreview')}`}
          onClose={() => setPreview(null)}
          footer={
            <>
              <button className="btn" onClick={() => setPreview(null)}>
                {t('cancel')}
              </button>
              <button className="btn primary" onClick={send} disabled={!preview.number}>
                ✉️ {t('send')}
              </button>
            </>
          }
        >
          <div className="grid">
            <Field label={t('cookPhone')}>
              <input className="input" value={preview.number || ''} readOnly />
            </Field>
            {!preview.number && <div className="alert amber small">⚙️ {t('settings')} → {t('cookPhone')}</div>}
            <Field label={t('message')}>
              <textarea className="input" rows={8} value={preview.message} onChange={(e) => setPreview({ ...preview, message: e.target.value })} />
            </Field>
            {DEMO && <div className="small muted">ℹ️ {t('demoSms')}</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
