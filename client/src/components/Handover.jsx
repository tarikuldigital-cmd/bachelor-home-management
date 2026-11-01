import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { t } from '../lib/i18n.js';
import { dateLabel } from '../lib/util.js';
import { Avatar, Field, Modal, useApi, useToast, Empty } from './ui.jsx';
import { useAuth } from '../App.jsx';

// Manager handover — one manager per month. Only the current manager can hand over.
// "Now": the selected member gets all manager options immediately, the old manager becomes a member.
// "From 1st of next month": scheduled; it switches automatically when the new month starts.
export function HandoverCard() {
  const { user, isManager, refresh } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const hist = useApi(() => api('managerHistory'), []);
  const members = useApi(() => api('directory'), []);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ memberId: '', mode: 'now', note: '' });
  const [busy, setBusy] = useState(false);

  const candidates = (members.data || []).filter((m) => m.active && m.id !== user.id);
  const pending = hist.data?.pending;
  const target = candidates.find((m) => m.id === f.memberId);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api('handoverManager', f);
      setOpen(false);
      if (r.scheduled) {
        toast(`✓ ${t('handoverScheduled')} ${dateLabel(r.date)}`);
        hist.reload();
      } else {
        toast(`✓ ${t('handoverDone')}`);
        await refresh();
        nav('/app');
      }
    } catch (e) {
      toast(e.message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3>🔄 {t('handoverManager')}</h3>
        {isManager && (
          <button className="btn primary" onClick={() => setOpen(true)} disabled={!candidates.length}>
            🔄 {t('handoverManager')}
          </button>
        )}
      </div>
      <div className="small muted mb">{t('handoverInfo')}</div>

      {pending && (
        <div className="alert amber mb">
          <span style={{ fontSize: 22 }}>⏳</span>
          <div className="grow small">
            {t('handoverPending')}: <b>{pending.name}</b> — {dateLabel(pending.date)}
            {pending.note && <div className="muted">“{pending.note}”</div>}
          </div>
          {isManager && (
            <button
              className="btn sm danger"
              onClick={async () => {
                await api('cancelHandover');
                hist.reload();
              }}
            >
              {t('cancel')}
            </button>
          )}
        </div>
      )}

      <b className="small">{t('managerHistory')}</b>
      {hist.data?.history?.length ? (
        hist.data.history.map((h, i) => {
          const m = (members.data || []).find((x) => x.id === h.memberId);
          return (
            <div className="list-item" key={i}>
              <Avatar src={m?.photo} name={h.name} size={36} />
              <div className="grow">
                <div className="bold">
                  {h.name} {!h.to && <span className="badge green">⭐ {t('current')}</span>}
                </div>
                <div className="tiny muted">
                  {dateLabel(h.from)} {h.from?.slice(0, 4)} → {h.to ? `${dateLabel(h.to)} ${h.to.slice(0, 4)}` : t('now')}
                  {h.note ? ` · “${h.note}”` : ''}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <Empty />
      )}

      {open && (
        <Modal
          title={`🔄 ${t('handoverManager')}`}
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setOpen(false)}>
                {t('cancel')}
              </button>
              <button className="btn primary" disabled={!f.memberId || busy} onClick={submit}>
                🔄 {t('handoverManager')}
              </button>
            </>
          }
        >
          <div className="grid">
            <Field label={t('newManager')}>
              <div className="grid g2">
                {candidates.map((m) => (
                  <label key={m.id} className={`card row ${f.memberId === m.id ? 'sel' : ''}`} style={{ padding: 10, cursor: 'pointer', gap: 10 }}>
                    <input type="radio" name="nm" checked={f.memberId === m.id} onChange={() => setF({ ...f, memberId: m.id })} style={{ accentColor: 'var(--primary)' }} />
                    <Avatar src={m.photo} name={m.name} size={32} />
                    <span className="bold small">{m.name}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label={t('when')}>
              <div className="tabs" style={{ width: 'fit-content' }}>
                <button type="button" className={f.mode === 'now' ? 'on' : ''} onClick={() => setF({ ...f, mode: 'now' })}>
                  ⚡ {t('handoverNow')}
                </button>
                <button type="button" className={f.mode === 'nextMonth' ? 'on' : ''} onClick={() => setF({ ...f, mode: 'nextMonth' })}>
                  📅 {t('handoverNextMonth')}
                </button>
              </div>
            </Field>
            <Field label={t('handoverNote')}>
              <textarea className="input" rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={t('handoverNotePh')} />
            </Field>
            {target && (
              <div className="alert amber small">
                ⚠️ {f.mode === 'now' ? t('handoverWarnNow', { name: target.name }) : t('handoverWarnNext', { name: target.name })}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
