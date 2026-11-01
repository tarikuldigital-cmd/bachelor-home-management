import { useState } from 'react';
import { api, DEMO } from '../lib/api.js';
import { t, n2 } from '../lib/i18n.js';
import { money, dateLabel, smsLink } from '../lib/util.js';
import { monthOf, todayStr } from '../lib/engine.js';
import { MonthPicker, Modal, Field, Spinner, useApi, useToast, Empty, Stat } from '../components/ui.jsx';
import { useAuth } from '../App.jsx';

export default function Bazar() {
  const { user, isManager, settings } = useAuth();
  const cur = settings?.currency || '৳';
  const toast = useToast();
  const [month, setMonth] = useState(monthOf(todayStr()));
  const [tab, setTab] = useState('bazar');
  const list = useApi(() => api('listBazar', { month }), [month]);
  const duties = useApi(() => api('listDuties', { month }), [month]);
  const members = useApi(() => api('directory'), []);
  const pub = useApi(() => api('publicSummary', { month }), [month]);
  const [form, setForm] = useState(null);
  const [dutyForm, setDutyForm] = useState(null);
  const [every, setEvery] = useState(2);

  const canAdd = isManager || settings?.membersCanAddBazar;
  const active = (members.data || []).filter((m) => m.active);

  const save = async () => {
    try {
      await api('addBazar', form);
      toast(t('saved'));
      setForm(null);
      list.reload();
      pub.reload();
    } catch (e) {
      toast(e.message, true);
    }
  };
  const del = async (b) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api('deleteBazar', { id: b.id });
      list.reload();
      pub.reload();
    } catch (e) {
      toast(e.message, true);
    }
  };
  const saveDuty = async () => {
    try {
      await api('saveDuty', dutyForm);
      setDutyForm(null);
      duties.reload();
    } catch (e) {
      toast(e.message, true);
    }
  };
  const autoDuty = async () => {
    try {
      await api('autoDuties', { month, everyDays: every });
      toast(t('saved'));
      duties.reload();
    } catch (e) {
      toast(e.message, true);
    }
  };
  const remind = async (d) => {
    try {
      const r = await api('sendDutyReminder', { id: d.id });
      if (r.ok) toast(`✓ ${t('sent')}`);
      else if (DEMO && r.number) window.open(smsLink(r.number, r.message));
      else toast(`${t('failed')}: ${r.info}`, true);
    } catch (e) {
      toast(e.message, true);
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between">
        <div className="tabs">
          <button className={tab === 'bazar' ? 'on' : ''} onClick={() => setTab('bazar')}>
            🛒 {t('bazar')}
          </button>
          <button className={tab === 'duty' ? 'on' : ''} onClick={() => setTab('duty')}>
            🧺 {t('bazarDuty')}
          </button>
        </div>
        <MonthPicker value={month} months={pub.data?.months || []} onChange={setMonth} />
      </div>

      {pub.data && (
        <div className="grid g3">
          <Stat label={t('totalBazar')} value={money(pub.data.totalBazar, cur)} ico="🛒" />
          <Stat label={t('totalMeals')} value={n2(pub.data.totalMeals)} ico="🍛" />
          <Stat label={t('mealRate')} value={money(pub.data.mealRate, cur)} ico="📈" hl />
        </div>
      )}

      {tab === 'bazar' && (
        <div className="card">
          <div className="card-head">
            <h3>🛒 {t('recentBazar')}</h3>
            {canAdd && (
              <button className="btn primary" onClick={() => setForm({ date: todayStr(), memberId: user.id, items: '', amount: '' })}>
                ＋ {t('add')}
              </button>
            )}
          </div>
          {list.loading && !list.data ? (
            <Spinner />
          ) : list.data?.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('date')}</th>
                    <th>{t('items')}</th>
                    <th>{t('by')}</th>
                    <th className="num">{t('amount')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((b) => (
                    <tr key={b.id}>
                      <td>{dateLabel(b.date)}</td>
                      <td>{b.items}</td>
                      <td className="muted">{b.by}</td>
                      <td className="num bold">{money(b.amount, cur)}</td>
                      <td className="right" style={{ whiteSpace: 'nowrap' }}>
                        {(isManager || b.memberId === user.id) && (
                          <>
                            <button className="btn sm ghost" onClick={() => setForm({ ...b })}>
                              ✏️
                            </button>
                            <button className="btn sm ghost danger" onClick={() => del(b)}>
                              🗑
                            </button>
                          </>
                        )}
                      </td>
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

      {tab === 'duty' && (
        <div className="card">
          <div className="card-head">
            <h3>🧺 {t('bazarDuty')}</h3>
            {isManager && (
              <div className="row">
                <label className="row small" style={{ gap: 6 }}>
                  {t('everyDays')}
                  <input className="input" type="number" min="1" style={{ width: 64 }} value={every} onChange={(e) => setEvery(e.target.value)} />
                </label>
                <button className="btn" onClick={autoDuty}>
                  ⚡ {t('autoDuty')}
                </button>
                <button className="btn primary" onClick={() => setDutyForm({ date: todayStr(), memberId: active[0]?.id || '' })}>
                  ＋ {t('add')}
                </button>
              </div>
            )}
          </div>
          {duties.data?.length ? (
            duties.data.map((d) => (
              <div className="list-item" key={d.id}>
                <span className={`badge ${d.date === todayStr() ? 'amber' : 'green'}`}>{dateLabel(d.date)}</span>
                <span className={`grow ${d.memberId === user.id ? 'bold' : ''}`}>
                  {d.name} {d.memberId === user.id && '(আপনি)'}
                </span>
                {isManager && (
                  <>
                    <button className="btn sm" onClick={() => remind(d)}>
                      ✉️ {t('remind')}
                    </button>
                    <button
                      className="btn sm ghost danger"
                      onClick={async () => {
                        await api('deleteDuty', { id: d.id });
                        duties.reload();
                      }}
                    >
                      🗑
                    </button>
                  </>
                )}
              </div>
            ))
          ) : (
            <Empty />
          )}
        </div>
      )}

      {form && (
        <Modal
          title={`🛒 ${t('bazar')}`}
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn" onClick={() => setForm(null)}>
                {t('cancel')}
              </button>
              <button className="btn primary" onClick={save}>
                {t('save')}
              </button>
            </>
          }
        >
          <div className="grid">
            <div className="grid g2">
              <Field label={t('date')}>
                <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label={t('amount')}>
                <input className="input" type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
              </Field>
            </div>
            {isManager && (
              <Field label={t('by')}>
                <select className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
                  {(members.data || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={t('items')}>
              <textarea className="input" value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} placeholder="চাল ৫কেজি, ডাল, মাছ..." />
            </Field>
          </div>
        </Modal>
      )}

      {dutyForm && (
        <Modal
          title={`🧺 ${t('bazarDuty')}`}
          onClose={() => setDutyForm(null)}
          footer={
            <button className="btn primary" onClick={saveDuty}>
              {t('save')}
            </button>
          }
        >
          <div className="grid g2">
            <Field label={t('date')}>
              <input className="input" type="date" value={dutyForm.date} onChange={(e) => setDutyForm({ ...dutyForm, date: e.target.value })} />
            </Field>
            <Field label={t('member')}>
              <select className="input" value={dutyForm.memberId} onChange={(e) => setDutyForm({ ...dutyForm, memberId: e.target.value })}>
                {active.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
