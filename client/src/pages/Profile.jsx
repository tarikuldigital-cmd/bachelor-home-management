import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { t, n2 } from '../lib/i18n.js';
import { money, num, dateLabel, resizeImage } from '../lib/util.js';
import { monthOf, todayStr, mealSlots, SLOT_KEY } from '../lib/engine.js';
import { Avatar, MonthPicker, Spinner, useApi, Empty, useToast } from '../components/ui.jsx';
import { AccountStats, DueAlert, DepositList } from '../components/Account.jsx';
import { useAuth } from '../App.jsx';
import { MemberForm } from './Members.jsx';

export default function Profile() {
  const { id } = useParams();
  const { user, settings, isManager, refresh } = useAuth();
  const toast = useToast();
  const cur = settings?.currency || '৳';
  const memberId = id || user.id;
  const slots = mealSlots(settings);
  const own = memberId === user.id;
  const [sel, setMonth] = useState('');
  const [tab, setTab] = useState('meals');
  const [editing, setEditing] = useState(false);
  const { data: d, loading, error, reload } = useApi(() => api('memberDetail', sel ? { memberId, month: sel } : { memberId }), [memberId, sel]);
  const month = d?.month || sel || monthOf(todayStr());

  if (error) return <div className="alert red">{error.message}</div>;
  if (loading && !d) return <Spinner />;
  const m = d.member;

  const changePhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await api('updateMyProfile', { photo: await resizeImage(f) });
      toast(t('saved'));
      reload();
      refresh();
    } catch (x) {
      toast(x.message, true);
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="profile-hero">
          <div style={{ position: 'relative' }}>
            <Avatar src={m.photo} name={m.name} size={96} />
            {own && (
              <label className="btn sm" style={{ position: 'absolute', bottom: -6, right: -6, borderRadius: 99, padding: '4px 8px' }} title={t('changePhoto')}>
                📷
                <input type="file" accept="image/*" hidden onChange={changePhoto} />
              </label>
            )}
          </div>
          <div className="grow">
            <h2 style={{ fontSize: 22 }}>{m.name}</h2>
            <div className="row mt" style={{ gap: 6 }}>
              <span className={`badge ${m.role === 'manager' ? 'green' : ''}`}>{m.role === 'manager' ? `⭐ ${t('manager')}` : t('member')}</span>
              {m.room && <span className="badge">🚪 {t('room')} {n2(m.room)}</span>}
              <span className={`badge ${m.active ? 'green' : 'red'}`}>{m.active ? t('active') : t('inactive')}</span>
            </div>
          </div>
          <div className="row">
            <MonthPicker value={month} months={d.months} onChange={setMonth} />
            <Link className="btn" to={`/invoice/${m.id}/${month}`}>
              🧾 {t('invoice')}
            </Link>
            {isManager && (
              <button className="btn primary" onClick={() => setEditing(true)}>
                ✏️ {t('edit')}
              </button>
            )}
          </div>
        </div>
        <div className="kv mt2">
          {m.phone && (
            <>
              <span className="k">{t('phone')}</span>
              <span>{m.phone}</span>
            </>
          )}
          <span className="k">{t('username')}</span>
          <span>@{m.username}</span>
          {m.profession && (
            <>
              <span className="k">{t('profession')}</span>
              <span>{m.profession}</span>
            </>
          )}
          {m.email && (
            <>
              <span className="k">{t('email')}</span>
              <span>{m.email}</span>
            </>
          )}
          {m.district && (
            <>
              <span className="k">{t('district')}</span>
              <span>{m.district}</span>
            </>
          )}
          {m.bloodGroup && (
            <>
              <span className="k">{t('bloodGroup')}</span>
              <span>{m.bloodGroup}</span>
            </>
          )}
          {m.dob && (
            <>
              <span className="k">{t('dob')}</span>
              <span>{m.dob}</span>
            </>
          )}
          {m.joinDate && (
            <>
              <span className="k">{t('joinDate')}</span>
              <span>{dateLabel(m.joinDate)} {n2(m.joinDate.slice(0, 4))}</span>
            </>
          )}
          {m.emergencyContact && (
            <>
              <span className="k">{t('emergencyContact')}</span>
              <span>{m.emergencyContact}</span>
            </>
          )}
          {m.address && (
            <>
              <span className="k">{t('address')}</span>
              <span>{m.address}</span>
            </>
          )}
          {isManager && m.nid && (
            <>
              <span className="k">{t('nid')}</span>
              <span>{m.nid}</span>
            </>
          )}
          <span className="k">{t('defaultMeals')}</span>
          <span>
            {slots.map((k) => `${t(SLOT_KEY[k])} ${num(m.defaultMeals?.[k] ?? 0)}`).join(' · ')}
          </span>
        </div>
      </div>

      <DueAlert stats={d.stats} cur={cur} month={month} />
      <AccountStats d={d} cur={cur} />

      {d.duties.length > 0 && (
        <div className="alert amber">
          🧺 {t('bazarDuty')}: <b>{d.duties.map((x) => dateLabel(x.date)).join(', ')}</b>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div className="tabs">
            {[
              ['meals', `🍛 ${t('meals')}`],
              ['deposits', `💰 ${t('deposits')}`],
              ['bazar', `🛒 ${t('bazar')}`],
            ].map(([k, l]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {tab === 'meals' &&
          (d.meals.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('date')}</th>
                    {slots.map((k) => (
                      <th key={k} className="num">
                        {t(SLOT_KEY[k])}
                      </th>
                    ))}
                    <th className="num">{t('total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.meals.map((x) => (
                    <tr key={x.id}>
                      <td>{dateLabel(x.date)}</td>
                      {slots.map((k) => (
                        <td key={k} className="num">
                          {num(x[k])}
                        </td>
                      ))}
                      <td className="num bold">{num(x.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          ))}
        {tab === 'deposits' && <DepositList deposits={d.deposits} cur={cur} />}
        {tab === 'bazar' &&
          (d.bazar.length ? (
            d.bazar.map((b) => (
              <div className="list-item" key={b.id}>
                <span className="badge green">{dateLabel(b.date)}</span>
                <span className="grow">{b.items}</span>
                <b>{money(b.amount, cur)}</b>
              </div>
            ))
          ) : (
            <Empty />
          ))}
      </div>

      {editing && (
        <MemberForm
          member={m}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
            if (own) refresh();
          }}
        />
      )}
    </div>
  );
}
