import { useState } from 'react';
import { api } from '../lib/api.js';
import { t, n2 } from '../lib/i18n.js';
import { money } from '../lib/util.js';
import { monthOf, todayStr, BILL_TYPES } from '../lib/engine.js';
import { MonthPicker, Modal, Field, Spinner, useApi, useToast, Empty, Stat } from '../components/ui.jsx';
import { useAuth } from '../App.jsx';

const ICONS = { electricity: '⚡', wifi: '📶', buya: '🧹', garbage: '🗑️', gas: '🔥', water: '💧', rent: '🏠', other: '📦' };

// Service charges — visible only to logged-in members & manager (never on public home)
export default function Bills() {
  const { isManager, settings } = useAuth();
  const cur = settings?.currency || '৳';
  const toast = useToast();
  const [month, setMonth] = useState(monthOf(todayStr()));
  const detail = useApi(() => api('memberDetail', { month }), [month]);
  const members = useApi(() => (isManager ? api('listMembers') : Promise.resolve([])), [isManager]);
  const [form, setForm] = useState(null);

  if (detail.loading && !detail.data) return <Spinner />;
  const d = detail.data;
  const bills = d.bills;
  const total = bills.reduce((s, b) => s + b.amount, 0);

  const save = async () => {
    try {
      await api('saveBill', { ...form, memberIds: form.split === 'some' ? form.memberIds : [] });
      toast(t('saved'));
      setForm(null);
      detail.reload();
    } catch (e) {
      toast(e.message, true);
    }
  };
  const del = async (b) => {
    if (!confirm(t('confirmDelete'))) return;
    await api('deleteBill', { id: b.id });
    detail.reload();
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between">
        <div className="row">
          <MonthPicker value={month} months={d.months} onChange={setMonth} />
          <span className="badge blue">🔒 {t('member')} + {t('manager')}</span>
        </div>
        {isManager && (
          <button className="btn primary" onClick={() => setForm({ month, type: 'electricity', amount: '', note: '', split: 'all', memberIds: [] })}>
            ＋ {t('add')}
          </button>
        )}
      </div>

      <div className="grid g3">
        <Stat label={t('totalBills')} value={money(total, cur)} ico="🧾" />
        <Stat label={t('yourShare')} value={money(d.stats?.serviceCharge || 0, cur)} ico="👤" hl />
        <Stat label={t('serviceBalance')} value={money(Math.abs(d.stats?.serviceBalance || 0), cur)} sub={(d.stats?.serviceBalance || 0) >= 0 ? t('willGet') : t('willPay')} ico="💳" />
      </div>

      <div className="card">
        {bills.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('type')}</th>
                  <th>{t('note')}</th>
                  <th className="num">{t('total')}</th>
                  <th className="num">{t('perHead')}</th>
                  <th className="num">{t('yourShare')}</th>
                  {isManager && <th></th>}
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id}>
                    <td className="bold">
                      {ICONS[b.type]} {t(b.type)}
                    </td>
                    <td className="muted">
                      {b.note}
                      {b.memberIds?.length ? <span className="badge" style={{ marginLeft: 6 }}>👤 {n2(b.memberIds.length)}</span> : null}
                    </td>
                    <td className="num">{money(b.amount, cur)}</td>
                    <td className="num">
                      {money(b.amount / b.splitCount, cur)} <span className="tiny muted">÷{n2(b.splitCount)}</span>
                    </td>
                    <td className="num bold">{money(b.share, cur)}</td>
                    {isManager && (
                      <td className="right" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn sm ghost" onClick={() => setForm({ ...b, split: b.memberIds?.length ? 'some' : 'all' })}>
                          ✏️
                        </button>
                        <button className="btn sm ghost danger" onClick={() => del(b)}>
                          🗑
                        </button>
                      </td>
                    )}
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
          title={`🧾 ${t('bills')}`}
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
              <Field label={t('month')}>
                <input className="input" type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
              </Field>
              <Field label={t('amount')}>
                <input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
              </Field>
            </div>
            <Field label={t('type')}>
              <div className="row" style={{ gap: 6 }}>
                {BILL_TYPES.map((k) => (
                  <button key={k} type="button" className={`btn sm ${form.type === k ? 'primary' : ''}`} onClick={() => setForm({ ...form, type: k })}>
                    {ICONS[k]} {t(k)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('note')}>
              <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>
            <div className="tabs">
              <button type="button" className={form.split === 'all' ? 'on' : ''} onClick={() => setForm({ ...form, split: 'all' })}>
                {t('splitAll')}
              </button>
              <button type="button" className={form.split === 'some' ? 'on' : ''} onClick={() => setForm({ ...form, split: 'some' })}>
                {t('splitSome')}
              </button>
            </div>
            {form.split === 'some' && (
              <div className="grid g2">
                {(members.data || [])
                  .filter((m) => m.active)
                  .map((m) => (
                    <label key={m.id} className="check">
                      <input
                        type="checkbox"
                        checked={form.memberIds.includes(m.id)}
                        onChange={(e) =>
                          setForm({ ...form, memberIds: e.target.checked ? [...form.memberIds, m.id] : form.memberIds.filter((x) => x !== m.id) })
                        }
                      />
                      {m.name}
                    </label>
                  ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
