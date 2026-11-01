import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { t, n2 } from '../lib/i18n.js';
import { monthLabel, money, num } from '../lib/util.js';
import { todayStr } from '../lib/engine.js';

export function Logo({ size = 38 }) {
  return <img src="./logo.svg" width={size} height={size} alt="Bachelor Home" style={{ borderRadius: size * 0.25 }} />;
}

export function Brand({ name }) {
  return (
    <div className="brand">
      <Logo />
      <div>
        <div className="t1">{name || 'Bachelor Home'}</div>
        <div className="t2">Management</div>
      </div>
    </div>
  );
}

export function Avatar({ src, name = '', size = 40 }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('');
  if (src) return <img className="avatar" src={src} alt={name} style={{ width: size, height: size }} />;
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials || '?'}
    </span>
  );
}

export function Stat({ label, value, sub, ico, hl, danger, className = '' }) {
  return (
    <div className={`card stat ${hl ? 'hl' : ''} ${danger ? 'hl-red' : ''} ${className}`}>
      {ico && <div className="ico">{ico}</div>}
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function MonthPicker({ value, months = [], onChange }) {
  const list = months.includes(value) ? months : [value, ...months];
  return (
    <select className="input" style={{ width: 'auto', minWidth: 150 }} value={value} onChange={(e) => onChange(e.target.value)}>
      {list.map((m) => (
        <option key={m} value={m}>
          {monthLabel(m)}
        </option>
      ))}
    </select>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 760 } : null}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn ghost icon-btn" onClick={onClose} aria-label="close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}

export function Empty({ text }) {
  return <div className="empty">{text || t('empty')}</div>;
}

export function Spinner() {
  return <div className="spinner" />;
}

export function Bars({ data, valueKey = 'meals', fmt = (v) => num(v) }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  const today = todayStr();
  return (
    <div>
      <div className="bars">
        {data.map((d) => (
          <div
            key={d.date}
            className={`b ${d.date === today ? 'today' : ''}`}
            style={{ height: `${(d[valueKey] / max) * 100}%` }}
            title={`${d.date}: ${fmt(d[valueKey])}`}
          />
        ))}
      </div>
      <div className="bars-x">
        {data.map((d, i) => (
          <span key={d.date}>{i % 5 === 0 ? n2(Number(d.date.slice(8))) : ''}</span>
        ))}
      </div>
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, disabled }) {
  return (
    <div className="stepper">
      <button type="button" disabled={disabled} onClick={() => onChange(Math.max(0, value - step))}>
        −
      </button>
      <span>{num(value)}</span>
      <button type="button" disabled={disabled} onClick={() => onChange(value + step)}>
        +
      </button>
    </div>
  );
}

export function Balance({ value, cur }) {
  const v = Number(value) || 0;
  if (Math.abs(v) < 0.005) return <span className="muted">{money(0, cur)}</span>;
  return (
    <span className={v > 0 ? 'pos' : 'neg'}>
      {money(Math.abs(v), cur)} <span className="tiny">({v > 0 ? t('willGet') : t('willPay')})</span>
    </span>
  );
}

// ---- toast ----
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const show = useCallback((text, err) => {
    setMsg({ text, err });
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => setMsg(null), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className={`toast ${msg.err ? 'err' : ''}`}>{msg.text}</div>}
    </ToastCtx.Provider>
  );
}

// ---- data hook ----
export function useApi(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    fn()
      .then((data) => live && setState({ data, loading: false, error: null }))
      .catch((error) => live && setState({ data: null, loading: false, error }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((x) => x + 1) };
}
