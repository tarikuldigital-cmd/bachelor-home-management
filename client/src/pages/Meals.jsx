import { useState, useEffect } from 'react';
import { api, DEMO } from '../lib/api.js';
import { t } from '../lib/i18n.js';
import { num, dateLabel, smsLink, whatsappLink } from '../lib/util.js';
import { todayStr, addDays, mealTotal, mealSlots, SLOT_KEY, effWeights } from '../lib/engine.js';
import { Avatar, Spinner, useApi, useToast, Empty, Field } from '../components/ui.jsx';
import { useAuth } from '../App.jsx';

// One tick button per meal: tap = ✓ / ✕, "+" adds a guest meal
function Tick({ value, onChange, label, disabled }) {
  const on = value > 0;
  if (disabled)
    return (
      <div className="meal-step">
        <span className="tiny muted">{label}</span>
        <span className={`tick ${on ? 'on' : ''}`} style={{ cursor: 'default' }}>
          {on ? `✓${value > 1 ? ` ×${num(value)}` : ''}` : '✕'}
        </span>
      </div>
    );
  return (
    <div className="meal-step">
      <span className="tiny muted">{label}</span>
      <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
        <button type="button" className={`tick ${on ? 'on' : ''}`} onClick={() => onChange(on ? 0 : 1)} aria-label={label}>
          {on ? `✓${value > 1 ? ` ×${num(value)}` : ''}` : ''}
        </button>
        {on && (
          <button type="button" className="tick-plus" title={t('guestMeal')} onClick={() => onChange(value + 1)}>
            +
          </button>
        )}
      </div>
    </div>
  );
}

function fill(tpl, vars) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

// Manager panel: what to cook + auto meal count -> SMS / WhatsApp to the cook
function CookPanel({ date, tot, slots }) {
  const toast = useToast();
  const s = useApi(() => api('getSettings'), []);
  const menus = useApi(() => api('listMenus', { from: date }), [date]);
  const [f, setF] = useState({ breakfast: '', lunch: '', dinner: '', note: '' });
  const [msg, setMsg] = useState('');
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const m = (menus.data || []).find((x) => x.date === date);
    setF(m ? { breakfast: m.breakfast || '', lunch: m.lunch || '', dinner: m.dinner || '', note: m.note || '' } : { breakfast: '', lunch: '', dinner: '', note: '' });
    setEdited(false);
  }, [menus.data, date]);

  const st = s.data || {};
  const lines = [];
  if (slots.includes('b') && f.breakfast) lines.push(`Breakfast (${num(tot.b)}): ${f.breakfast}`);
  if (f.lunch) lines.push(`Lunch (${num(tot.l)}): ${f.lunch}`);
  if (f.dinner) lines.push(`Dinner (${num(tot.d)}): ${f.dinner}`);
  if (f.note) lines.push(`Note: ${f.note}`);
  const totalMeals = slots.reduce((a, k) => a + tot[k], 0);
  const countText = (slots.includes('b') ? `Breakfast ${num(tot.b)}, ` : '') + `Lunch ${num(tot.l)}, Dinner ${num(tot.d)} (Total ${num(totalMeals)})`;
  const auto = fill(st.menuSmsTemplate || '{cook}, menu for {date}:\n{menu}\nMeals: {meals}\n- {mess}', {
    cook: st.cookName || 'Cook',
    date,
    menu: lines.join('\n') || '-',
    meals: countText,
    mess: st.messName || '',
  });
  const message = edited ? msg : auto;

  const saveMenu = () => api('saveMenu', { date, ...f });

  const sendSms = async () => {
    if (!st.cookPhone) return toast(t('needCookPhone'), true);
    setBusy(true);
    try {
      await saveMenu();
      const r = await api('sendMenuToCook', { date, message });
      if (r.ok) toast(`✓ SMS ${t('sent')}`);
      else if (DEMO) window.open(smsLink(st.cookPhone, message));
      else toast(`${t('failed')}: ${r.info}`, true);
      menus.reload();
    } catch (e) {
      toast(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const sendWhatsapp = () => {
    if (!st.cookPhone) return toast(t('needCookPhone'), true);
    // open right away (browsers block pop-ups opened after an await), save in background
    window.open(whatsappLink(st.cookPhone, message), '_blank');
    saveMenu().catch((e) => toast(e.message, true));
  };

  return (
    <div className="card cook-panel">
      <div className="card-head">
        <h3>👨‍🍳 {t('cookPanel')} — {dateLabel(date)}</h3>
        <span className="badge green">
          {t('totalMeals')}: {num(totalMeals)}
        </span>
      </div>
      <div className="small muted mb">
        {t('cookName')}: <b>{st.cookName || '—'}</b> · {t('cookPhone')}: <b>{st.cookPhone || '—'}</b>
      </div>
      <div className="grid g2">
        {slots.map((k) => (
          <Field key={k} label={`${t(SLOT_KEY[k])} — ${t('whatToCook')} (${num(tot[k])} ${t('meals')})`}>
            <input
              className="input"
              value={f[SLOT_KEY[k]]}
              placeholder={k === 'l' ? 'Rice, fish curry, dal' : k === 'd' ? 'Rice, chicken, vegetables' : 'Khichuri, egg'}
              onChange={(e) => {
                setF({ ...f, [SLOT_KEY[k]]: e.target.value });
                setEdited(false);
              }}
            />
          </Field>
        ))}
        <Field label={t('note')}>
          <input
            className="input"
            value={f.note}
            placeholder="Less spicy, 2 guests..."
            onChange={(e) => {
              setF({ ...f, note: e.target.value });
              setEdited(false);
            }}
          />
        </Field>
      </div>
      <Field label={`${t('message')} (${t('autoFilled')})`} className="mt">
        <textarea
          className="input"
          rows={6}
          value={message}
          onChange={(e) => {
            setMsg(e.target.value);
            setEdited(true);
          }}
        />
      </Field>
      <div className="row mt">
        <button className="btn primary" disabled={busy} onClick={sendSms}>
          ✉️ {t('sendSms')}
        </button>
        <button className="btn whatsapp" onClick={sendWhatsapp}>
          🟢 WhatsApp
        </button>
        <button
          className="btn ghost"
          onClick={async () => {
            await saveMenu();
            toast(t('saved'));
          }}
        >
          💾 {t('save')}
        </button>
      </div>
      {DEMO && <div className="tiny muted mt">ℹ️ {t('demoSms')}</div>}
    </div>
  );
}

export default function Meals() {
  const { isManager, settings } = useAuth();
  const toast = useToast();
  const [date, setDate] = useState(addDays(todayStr(), isManager ? 1 : 0));
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
  const bulk = async (slot, value) => {
    setRows((rs) => rs.map((x) => ({ ...x, [slot]: value })));
    try {
      await api('setMealsBulk', { date, slot, value });
    } catch (e) {
      toast(e.message, true);
    }
    reload();
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
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn sm ${date === today ? 'primary' : ''}`} onClick={() => setDate(today)}>
              {t('today')}
            </button>
            <button className={`btn sm ${date === addDays(today, 1) ? 'primary' : ''}`} onClick={() => setDate(addDays(today, 1))}>
              {t('tomorrow')}
            </button>
          </div>
        </div>
        <div className="meal-totals mt">
          {slots.map((k) => (
            <div key={k}>
              <div className="k">{t(SLOT_KEY[k])}</div>
              <div className="v">{num(tot[k])}</div>
            </div>
          ))}
          <div className="hl">
            <div className="k">{t('totalMeals')}</div>
            <div className="v">{num(tot.t)}</div>
          </div>
        </div>
        {isManager ? (
          <div className="row mt" style={{ gap: 6 }}>
            {slots.map((k) => (
              <span key={k} className="row" style={{ gap: 4 }}>
                <button className="btn sm" onClick={() => bulk(k, 1)}>
                  ✓ {t('allOn')} {t(SLOT_KEY[k])}
                </button>
                <button className="btn sm ghost" onClick={() => bulk(k, 0)}>
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="small muted mt">🔒 {t('managerOnlyMeals')}</div>
        )}
      </div>

      <div className="card">
        {loading && !rows ? (
          <Spinner />
        ) : rows?.length ? (
          <div>
            {isManager && <div className="tiny muted mb">👆 {t('tickHelp')}</div>}
            {rows.map((r) => (
              <div className="meal-row" key={r.memberId}>
                <div className="row" style={{ gap: 8, flexWrap: 'nowrap', minWidth: 170 }}>
                  <Avatar src={r.photo} name={r.name} size={34} />
                  <span className="bold grow">{r.name}</span>
                  <span className={`badge ${mealTotal(r, w) ? 'green' : ''} meal-total`}>{num(mealTotal(r, w))}</span>
                </div>
                <div className="meal-steps">
                  {slots.map((k) => (
                    <Tick key={k} label={t(SLOT_KEY[k])} value={r[k]} disabled={!canEdit} onChange={(v) => update(r, k, v)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </div>

      {isManager && <CookPanel date={date} tot={tot} slots={slots} />}
    </div>
  );
}
