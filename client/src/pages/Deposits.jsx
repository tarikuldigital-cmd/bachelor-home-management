import { useState } from 'react';
import { api } from '../lib/api.js';
import { t } from '../lib/i18n.js';
import { money, dateLabel } from '../lib/util.js';
import { monthOf, todayStr } from '../lib/engine.js';
import { MonthPicker, Modal, Field, Spinner, useApi, useToast, Empty, Stat } from '../components/ui.jsx';
import { useAuth } from '../App.jsx';

export default function Deposits() {
  const { settings } = useAuth();
  const cur = settings?.currency || '৳';
  const toast = useToast();
  const [month, setMonth] = useState(monthOf(todayStr()));
  const list = useApi(() => api('listDeposits', { month }), [month]);
  const members = useApi(() => api('listMembers'), []);
  const ov = useApi(() => api('overview', { month }), [month]);
  const [form, setForm] = useState(null);

  const save = async () => {
    try {
      await api('saveDeposit', form);
      toast(t('saved'));
      setForm(null);
      list.reload();
      ov.reload();
    } catch (e) {
      toast(e.message, true);
    }
  };
  const del = async (x) => {
    if (!confirm(t('confirmDelete'))) return;
    await api('deleteDeposit', { id: x.id });
    list.reload();
    ov.reload();
  };
  const sum = (type) => (list.data || []).filter((x) => (type === 'service' ? x.type === 'service' : x.type !== 'service')).reduce((s, x) => s + x.amount, 0);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between">
        <MonthPicker value={month} months={ov.data?.months || []} onChange={setMonth} />
        <button className="btn primary" onClick={() => setForm({ date: todayStr(), memberId: members.data?.find((m) => m.active)?.id || '', amount: '', type: 'meal', note: '' })}>
          ＋ {t('add')}
        </button>
      </div>
      <div className="grid g3">
        <Stat label={t('mealDeposit')} value={money(sum('meal'), cur)} ico="🍛" />
        <Stat label={t('serviceDeposit')} value={money(sum('service'), cur)} ico="🧾" />
        <Stat label={t('totalDeposit')} value={money(sum('meal') + sum('service'), cur)} ico="💰" hl />
      </div>
      <div className="card">
        {list.loading && !list.data ? (
          <Spinner />
        ) : list.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{t('name')}</th>
                  <th>{t('type')}</th>
                  <th>{t('note')}</th>
                  <th className="num">{t('amount')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((x) => (
                  <tr key={x.id}>
                    <td>{dateLabel(x.date)}</td>
                    <td className="bold">{x.name}</td>
                    <td>
                      <span className={`badge ${x.type === 'service' ? 'blue' : 'green'}`}>{x.type === 'service' ? t('serviceDep') : t('mealDep')}</span>
                    </td>
                    <td className="muted">{x.note}</td>
                    <td className="num bold">{money(x.amount, cur)}</td>
                    <td className="right" style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn sm ghost" onClick={() => setForm({ ...x })}>
                        ✏️
                      </button>
                      <button className="btn sm ghost danger" onClick={() => del(x)}>
                        🗑
                      </button>
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

      {form && (
        <Modal
          title={`💰 ${t('deposits')}`}
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
            <Field label={t('member')}>
              <select className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
                {(members.data || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.active ? '' : ` (${t('inactive')})`}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid g2">
              <Field label={t('date')}>
                <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label={t('amount')}>
                <input className="input" type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
              </Field>
            </div>
            <Field label={t('type')}>
              <div className="tabs">
                <button type="button" className={form.type !== 'service' ? 'on' : ''} onClick={() => setForm({ ...form, type: 'meal' })}>
                  🍛 {t('mealDep')}
                </button>
                <button type="button" className={form.type === 'service' ? 'on' : ''} onClick={() => setForm({ ...form, type: 'service' })}>
                  🧾 {t('serviceDep')}
                </button>
              </div>
            </Field>
            <Field label={t('note')}>
              <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="bKash / Nagad / Cash" />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
