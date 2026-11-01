import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { t, n2 } from '../lib/i18n.js';
import { resizeImage } from '../lib/util.js';
import { todayStr } from '../lib/engine.js';
import { Avatar, Modal, Field, Spinner, useApi, useToast, Empty } from '../components/ui.jsx';
import { useAuth } from '../App.jsx';

export function PhotoInput({ value, name, onChange }) {
  const toast = useToast();
  return (
    <div className="row">
      <Avatar src={value} name={name} size={72} />
      <label className="btn sm">
        📷 {t('changePhoto')}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              onChange(await resizeImage(f));
            } catch {
              toast('Image error', true);
            }
          }}
        />
      </label>
      {value && (
        <button type="button" className="btn sm ghost" onClick={() => onChange('')}>
          ✕
        </button>
      )}
    </div>
  );
}

export function MemberForm({ member, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(() => ({
    name: '',
    username: '',
    password: '',
    phone: '',
    email: '',
    room: '',
    profession: '',
    address: '',
    nid: '',
    emergencyContact: '',
    joinDate: todayStr(),
    leaveDate: '',
    active: true,
    photo: '',
    defaultMeals: { b: 1, l: 1, d: 1 },
    ...(member || {}),
    password: '',
  }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setDm = (k, v) => setF({ ...f, defaultMeals: { ...f.defaultMeals, [k]: Number(v) } });

  const save = async () => {
    setBusy(true);
    try {
      const r = await api('saveMember', f);
      toast(t('saved'));
      onSaved(r);
    } catch (e) {
      toast(e.message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={member ? `${t('edit')}: ${member.name}` : t('addMember')}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn primary" disabled={busy} onClick={save}>
            {t('save')}
          </button>
        </>
      }
    >
      <div className="grid" style={{ gap: 14 }}>
        <PhotoInput value={f.photo} name={f.name} onChange={(photo) => setF({ ...f, photo })} />
        <div className="grid g2">
          <Field label={`${t('name')} *`}>
            <input className="input" value={f.name} onChange={set('name')} />
          </Field>
          <Field label={`${t('phone')} (SMS)`}>
            <input className="input" value={f.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" inputMode="tel" />
          </Field>
          <Field label={`${t('username')} *`}>
            <input className="input" value={f.username} onChange={set('username')} placeholder="rahim" autoCapitalize="none" />
          </Field>
          <Field label={member ? t('newPasswordHint') : `${t('password')} *`}>
            <input className="input" value={f.password} onChange={set('password')} type="text" />
          </Field>
          <Field label={t('room')}>
            <input className="input" value={f.room} onChange={set('room')} />
          </Field>
          <Field label={t('profession')}>
            <input className="input" value={f.profession} onChange={set('profession')} />
          </Field>
          <Field label={t('email')}>
            <input className="input" value={f.email} onChange={set('email')} type="email" />
          </Field>
          <Field label={t('emergencyContact')}>
            <input className="input" value={f.emergencyContact} onChange={set('emergencyContact')} />
          </Field>
          <Field label={t('nid')}>
            <input className="input" value={f.nid} onChange={set('nid')} />
          </Field>
          <Field label={t('address')}>
            <input className="input" value={f.address} onChange={set('address')} />
          </Field>
          <Field label={t('joinDate')}>
            <input className="input" type="date" value={f.joinDate} onChange={set('joinDate')} />
          </Field>
          <Field label={t('leaveDate')}>
            <input className="input" type="date" value={f.leaveDate} onChange={set('leaveDate')} />
          </Field>
        </div>
        <Field label={t('defaultMeals')}>
          <div className="row">
            {['b', 'l', 'd'].map((k) => (
              <label key={k} className="row" style={{ gap: 6 }}>
                <span className="small muted">{t({ b: 'breakfast', l: 'lunch', d: 'dinner' }[k])}</span>
                <input className="input" style={{ width: 70 }} type="number" min="0" step="0.5" value={f.defaultMeals?.[k] ?? 0} onChange={(e) => setDm(k, e.target.value)} />
              </label>
            ))}
          </div>
        </Field>
        <label className="check">
          <input type="checkbox" checked={f.active} onChange={set('active')} /> {t('active')}
        </label>
      </div>
    </Modal>
  );
}

export default function Members() {
  const { isManager } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const { data, loading, reload } = useApi(() => api(isManager ? 'listMembers' : 'directory'), [isManager]);
  const [edit, setEdit] = useState(null); // null | {} | member
  const [q, setQ] = useState('');

  if (loading && !data) return <Spinner />;
  const list = (data || []).filter((m) => (m.name + (m.room || '') + (m.username || '')).toLowerCase().includes(q.toLowerCase()));
  const active = list.filter((m) => m.active);
  const inactive = list.filter((m) => !m.active);

  const del = async (m) => {
    if (!confirm(`${m.name} — ${t('confirmDelete')}`)) return;
    try {
      const r = await api('deleteMember', { id: m.id });
      toast(r.deactivated ? t('inactive') : t('saved'));
      reload();
    } catch (e) {
      toast(e.message, true);
    }
  };

  const card = (m) => (
    <div key={m.id} className="card member-card" onClick={() => (isManager ? nav(`/app/members/${m.id}`) : null)} style={!isManager ? { cursor: 'default' } : null}>
      <Avatar src={m.photo} name={m.name} size={76} />
      <div className="bold mt" style={{ fontSize: 16 }}>
        {m.name}
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 6 }}>
        {m.role === 'manager' && <span className="badge green">⭐ {t('manager')}</span>}
        {m.room && <span className="badge">🚪 {t('room')} {n2(m.room)}</span>}
        {!m.active && <span className="badge red">{t('inactive')}</span>}
      </div>
      {isManager && (
        <>
          {m.phone && <div className="small muted mt">📱 {m.phone}</div>}
          <div className="tiny muted">@{m.username}</div>
          <div className="row mt" style={{ justifyContent: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <button className="btn sm" onClick={() => setEdit(m)}>
              ✏️ {t('edit')}
            </button>
            {m.role !== 'manager' && (
              <button className="btn sm danger" onClick={() => del(m)}>
                🗑
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between">
        <div className="row">
          <h3>
            👥 {isManager ? t('members') : t('directory')} <span className="badge green">{n2(active.length)}</span>
          </h3>
        </div>
        <div className="row">
          <input className="input" style={{ width: 200 }} placeholder="🔍" value={q} onChange={(e) => setQ(e.target.value)} />
          {isManager && (
            <button className="btn primary" onClick={() => setEdit({})}>
              ＋ {t('addMember')}
            </button>
          )}
        </div>
      </div>
      {active.length ? <div className="grid g4">{active.map(card)}</div> : <Empty />}
      {inactive.length > 0 && (
        <>
          <h3 className="muted">{t('inactive')}</h3>
          <div className="grid g4">{inactive.map(card)}</div>
        </>
      )}
      {edit && (
        <MemberForm
          member={edit.id ? edit : null}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
