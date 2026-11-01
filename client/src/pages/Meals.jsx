import { useState } from 'react';
import { api } from '../lib/api.js';
import { t, n2 } from '../lib/i18n.js';
import { num, dateLabel } from '../lib/util.js';
import { todayStr, addDays, mealTotal, mealSlots, SLOT_KEY, effWeights } from '../lib/engine.js';
import { Avatar, Stepper, Spinner, useApi, useToast, Empty } from '../components/ui.jsx';
import { useAuth } from '../App.jsx';

export default function Meals() {
  const { isManager, settings } = useAuth();
  const toast = useToast();
  const [date, setDate] = useState(todayStr());
  const { data, loading, reload } = useApi(() => api('mealsForDate', { date }), [date]);
  const [rows, setRows] = useState(null);
  const [lastDate, setLastDate] = useState(null);
  const w = effWeights(settings || { weights: { b: 0.5, l: 1, d: 1 } });
  const slots = mealSlots(settings);

  if (data && lastDate !== date + JSON.stringify(data)) {
    setLastDate(date + JSON.stringify(data));
    setRows(data);
  }

  const update = async (r, k, v) => {
    const next = { ...r, [k]: v };
    setRows((rs) => rs.map((x) => (x.memberId === r.memberId ? next : x)));
    try {
      await api('setMeal', { date, memberId: r.memberId, b: next.b, l: next.l, d: next.d });
    } catch (e) {
      toast(e.message, true);
      reload();
    }
  };

  const applyDefault = async () => {
    try {
      const r = await api('applyDefaultMeals', { date });
      toast(`✓ ${n2(r.added)}`);
      reload();
    } catch (e) {
      toast(e.message, true);
    }
  };

  const tot = (rows || []).reduce(
    (s, r) => ({ b: s.b + r.b, l: s.l + r.l, d: s.d + r.d, t: s.t + mealTotal(r, w) }),
    { b: 0, l: 0, d: 0, t: 0 },
  );
  const today = todayStr();
  const canEdit = isManager; // personal charges: only the manager updates

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="row between">
          <div className="row">
            <button className="btn icon-btn" onClick={() => setDate(addDays(date, -1))}>
              ‹
            </button>
            <input className="input" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ width: 170 }} />
            <button className="btn icon-btn" onClick={() => setDate(addDays(date, 1))}>
              ›
            </button>
            {date !== today && (
              <button className="btn sm ghost" onClick={() => setDate(today)}>
                {t('date')}: {dateLabel(today)}
              </button>
            )}
          </div>
          {isManager && (
            <button className="btn primary" onClick={applyDefault}>
              ⚡ {t('applyDefault')}
            </button>
          )}
        </div>
        <div className="row mt" style={{ gap: 8 }}>
          {slots.map((k) => (
            <span key={k} className="badge">
              {t(SLOT_KEY[k])}: {num(tot[k])}
            </span>
          ))}
          <span className="badge green">
            {t('totalMeals')}: {num(tot.t)}
          </span>
          <span className="tiny muted">
            ({t('weights')}: {slots.map((k) => num(w[k])).join('/')})
          </span>
        </div>
        {!isManager && (
          <div className="small muted mt">
            🔒 {t('managerOnlyMeals')}
          </div>
        )}
      </div>

      <div className="card">
        {loading && !rows ? (
          <Spinner />
        ) : rows?.length ? (
          <div>
            {rows.map((r) => (
              <div className="meal-row" key={r.memberId}>
                <div className="row" style={{ gap: 8, flexWrap: 'nowrap', minWidth: 170 }}>
                  <Avatar src={r.photo} name={r.name} size={34} />
                  <span className="bold grow">{r.name}</span>
                  <span className="badge green meal-total">{num(mealTotal(r, w))}</span>
                </div>
                <div className="meal-steps">
                  {slots.map((k) => (
                    <div key={k} className="meal-step">
                      <span className="tiny muted">{t(SLOT_KEY[k])}</span>
                      {canEdit ? (
                        <Stepper value={r[k]} step={k === 'b' ? 0.5 : 1} onChange={(v) => update(r, k, v)} />
                      ) : (
                        <span className={`badge ${r[k] ? 'green' : ''}`} style={{ minWidth: 44, justifyContent: 'center', fontSize: 14 }}>
                          {r[k] ? `✓ ${num(r[k])}` : '✕'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </div>
    </div>
  );
}
