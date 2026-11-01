import { useState } from 'react';
import { api, DEMO } from '../lib/api.js';
import { t, n2 } from '../lib/i18n.js';
import { money, smsLink, timeAgo } from '../lib/util.js';
import { monthOf, todayStr } from '../lib/engine.js';
import { MonthPicker, Spinner, useApi, useToast, Empty, Avatar } from '../components/ui.jsx';
import { useAuth } from '../App.jsx';

export default function Sms() {
  const { settings } = useAuth();
  const cur = settings?.currency || '৳';
  const toast = useToast();
  const [month, setMonth] = useState(monthOf(todayStr()));
  const [tab, setTab] = useState('due');
  const dues = useApi(() => api('dueList', { month }), [month]);
  const members = useApi(() => api('listMembers'), []);
  const log = useApi(() => api('smsLog'), []);
  const ov = useApi(() => api('overview', { month }), [month]);
  const [sel, setSel] = useState([]);
  const [custom, setCustom] = useState({ ids: [], message: '', alsoNotify: true });
  const [busy, setBusy] = useState(false);

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const sendDue = async () => {
    setBusy(true);
    try {
      const r = await api('sendDueSms', { month, memberIds: sel });
      const ok = r.filter((x) => x.ok).length;
      toast(`✓ ${n2(ok)}/${n2(r.length)} ${t('sent')}${DEMO ? ' (demo)' : ''}`);
      setSel([]);
      log.reload();
    } catch (e) {
      toast(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const sendCustom = async () => {
    setBusy(true);
    try {
      const r = await api('sendCustomSms', { memberIds: custom.ids, message: custom.message, alsoNotify: custom.alsoNotify });
      toast(`✓ ${n2(r.filter((x) => x.ok).length)}/${n2(r.length)} ${t('sent')}${DEMO ? ' (demo)' : ''}`);
      setCustom({ ...custom, message: '', ids: [] });
      log.reload();
    } catch (e) {
      toast(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const broadcast = async () => {
    try {
      await api('broadcast', { message: custom.message });
      toast(t('saved'));
    } catch (e) {
      toast(e.message, true);
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between">
        <div className="tabs">
          {[
            ['due', `⚠️ ${t('dueReminder')}`],
            ['custom', `✉️ ${t('customSms')}`],
            ['log', `📜 ${t('smsLog')}`],
          ].map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
        {tab === 'due' && <MonthPicker value={month} months={ov.data?.months || []} onChange={setMonth} />}
      </div>
      {DEMO && <div className="alert amber small">ℹ️ {t('demoSms')}</div>}

      {tab === 'due' && (
        <div className="card">
          <div className="card-head">
            <h3>⚠️ {t('dueReminder')}</h3>
            <div className="row">
              <button className="btn sm" onClick={() => setSel(sel.length === (dues.data || []).length ? [] : (dues.data || []).map((d) => d.memberId))}>
                {t('selectAll')}
              </button>
              <button className="btn primary" disabled={!sel.length || busy} onClick={sendDue}>
                ✉️ {t('sendSelected')} ({n2(sel.length)})
              </button>
            </div>
          </div>
          {dues.loading && !dues.data ? (
            <Spinner />
          ) : dues.data?.length ? (
            dues.data.map((d) => (
              <div className="list-item" key={d.memberId} style={{ alignItems: 'flex-start' }}>
                <input type="checkbox" className="check" style={{ width: 18, height: 18, marginTop: 10, accentColor: 'var(--primary)' }} checked={sel.includes(d.memberId)} onChange={() => toggle(d.memberId)} />
                <Avatar src={d.photo} name={d.name} size={38} />
                <div className="grow">
                  <div className="row between">
                    <b>{d.name}</b>
                    <span className="badge red">
                      {t('due')}: {money(d.due, cur)}
                    </span>
                  </div>
                  <div className="tiny muted">
                    📱 {d.phone || '—'} · {t('meals')}: {money(Math.max(0, -d.mealBalance), cur)} · {t('serviceCharge')}: {money(Math.max(0, -d.serviceBalance), cur)}
                  </div>
                  <div className="small mt" style={{ background: 'var(--bg2)', padding: '8px 10px', borderRadius: 10 }}>
                    {d.message}
                  </div>
                  {DEMO && d.phone && (
                    <a className="btn sm mt" href={smsLink(d.phone, d.message)}>
                      📱 {t('openSmsApp')}
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <Empty text={`✅ ${t('noDues')}`} />
          )}
        </div>
      )}

      {tab === 'custom' && (
        <div className="card">
          <div className="grid">
            <div className="row between">
              <b>{t('members')}</b>
              <button className="btn sm" onClick={() => setCustom({ ...custom, ids: custom.ids.length ? [] : (members.data || []).filter((m) => m.active).map((m) => m.id) })}>
                {t('selectAll')}
              </button>
            </div>
            <div className="grid g3">
              {(members.data || [])
                .filter((m) => m.active)
                .map((m) => (
                  <label key={m.id} className="check">
                    <input
                      type="checkbox"
                      checked={custom.ids.includes(m.id)}
                      onChange={(e) => setCustom({ ...custom, ids: e.target.checked ? [...custom.ids, m.id] : custom.ids.filter((x) => x !== m.id) })}
                    />
                    {m.name} <span className="tiny muted">{m.phone}</span>
                  </label>
                ))}
            </div>
            <textarea className="input" rows={4} placeholder={`${t('message')} ({name} = নাম)`} value={custom.message} onChange={(e) => setCustom({ ...custom, message: e.target.value })} />
            <div className="tiny muted">{n2(custom.message.length)} chars</div>
            <label className="check">
              <input type="checkbox" checked={custom.alsoNotify} onChange={(e) => setCustom({ ...custom, alsoNotify: e.target.checked })} /> 🔔 {t('notifications')}
            </label>
            <div className="row">
              <button className="btn primary" disabled={busy || !custom.ids.length || !custom.message} onClick={sendCustom}>
                ✉️ {t('send')}
              </button>
              <button className="btn" disabled={!custom.message} onClick={broadcast}>
                📢 {t('broadcast')}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'log' && (
        <div className="card">
          {log.data?.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('date')}</th>
                    <th>{t('phone')}</th>
                    <th>{t('type')}</th>
                    <th>{t('message')}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {log.data.map((x) => (
                    <tr key={x.id}>
                      <td className="small" style={{ whiteSpace: 'nowrap' }}>
                        {timeAgo(x.date)}
                      </td>
                      <td className="small">{x.number || '—'}</td>
                      <td>
                        <span className="badge">{x.kind}</span>
                      </td>
                      <td className="small" style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>
                        {x.message}
                      </td>
                      <td>{x.ok ? <span className="badge green">✓ {t('sent')}</span> : <span className="badge amber">{x.info === 'demo' ? 'demo' : `${t('failed')}`}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </div>
      )}
    </div>
  );
}
