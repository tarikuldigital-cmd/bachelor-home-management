import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { t, n2, getLang } from '../lib/i18n.js';
import { money, monthLabel } from '../lib/util.js';

// Discipline lines that rotate in the headline
const LINES = [
  ['এক রান্নাঘর, সবাই মিলে, একটাই নিয়ম — সময়মতো।', 'One kitchen, all of us, one rule: on time.'],
  ['রাত ১০টার আগে মিল জানাও, বাবুর্চিকে সময় দাও।', 'Tell the manager your meal before 10 PM.'],
  ['সময়মতো জমা দিলে পুরো মাসটা শান্ত থাকে।', 'Pay on time and the whole month stays calm.'],
  ['পরিষ্কার রান্নাঘর সবার দায়িত্ব।', 'A clean kitchen is everyone’s job.'],
  ['আজকের বাজারের হিসাব আজই।', 'Today’s bazar, settled today.'],
];

// A small CSS-3D house: every lit window is one member of the mess.
function House({ members }) {
  const lit = Math.max(1, Math.min(members || 8, 12));
  const front = Array.from({ length: 6 }, (_, i) => i < Math.min(lit, 6));
  const side = Array.from({ length: 6 }, (_, i) => i + 6 < lit);
  return (
    <div className="h3-house">
      <div className="h3-ground" />
      <div className="h3-face h3-front">
        <div className="h3-windows">
          {front.map((on, i) => (
            <span key={i} className={`h3-win ${on ? 'on' : ''}`} style={{ animationDelay: `${0.25 + i * 0.12}s` }} />
          ))}
        </div>
        <span className="h3-door" />
      </div>
      <div className="h3-face h3-back" />
      <div className="h3-face h3-left" />
      <div className="h3-face h3-right">
        <div className="h3-windows side">
          {side.map((on, i) => (
            <span key={i} className={`h3-win ${on ? 'on' : ''}`} style={{ animationDelay: `${1 + i * 0.12}s` }} />
          ))}
        </div>
      </div>
      <div className="h3-roof r1" />
      <div className="h3-roof r2" />
      <div className="h3-gable g1" />
      <div className="h3-gable g2" />
      <div className="h3-chimney">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export function Hero3D({ data, month, user }) {
  const sceneRef = useRef(null);
  const [line, setLine] = useState(0);
  const lang = getLang();

  // rotate discipline lines
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const iv = setInterval(() => setLine((x) => (x + 1) % LINES.length), 4200);
    return () => clearInterval(iv);
  }, []);

  // tilt with pointer (desktop) or phone orientation (mobile)
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const set = (rx, ry) => {
      el.style.setProperty('--rx', `${rx}deg`);
      el.style.setProperty('--ry', `${ry}deg`);
    };
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / r.width;
      const y = (e.clientY - (r.top + r.height / 2)) / r.height;
      set(-8 - y * 14, -35 + x * 30);
    };
    const onLeave = () => set(-8, -35);
    const onTilt = (e) => {
      if (e.gamma == null) return;
      set(-8 - Math.max(-20, Math.min(20, (e.beta || 45) - 45)) * 0.4, -35 + Math.max(-30, Math.min(30, e.gamma)) * 0.8);
    };
    const host = el.parentElement;
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    window.addEventListener('deviceorientation', onTilt);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('deviceorientation', onTilt);
    };
  }, []);

  const menu = data.todayMenu;
  const L = LINES[line][lang === 'en' ? 1 : 0];

  return (
    <section className="h3">
      <div className="h3-copy">
        <div className="h3-mess">
          {data.messName}
          {data.address ? <span className="muted"> · {data.address}</span> : null}
        </div>
        <h1 className="h3-title" aria-live="polite">
          <span key={line} className="h3-line">
            {L}
          </span>
        </h1>
        <p className="h3-sub">{t('heroSub')}</p>
        <div className="h3-rate">
          <div>
            <div className="h3-rate-k">
              {t('runningMealRate')} · {monthLabel(month)}
            </div>
            <div className="h3-rate-v">{money(data.mealRate, data.currency)}</div>
          </div>
          <div className="h3-rate-meta">
            <b>{n2(data.totalMeals)}</b> {t('meals')}
            <br />
            <b>{money(data.totalBazar, data.currency)}</b> {t('bazar')}
          </div>
        </div>
        <div className="row h3-cta">
          <Link className="btn primary h3-btn" to={user ? '/app' : '/login'}>
            {user ? t('goDashboard') : t('loginToAccount')}
          </Link>
          <a className="btn h3-btn" href="#this-month">
            {t('seeThisMonth')}
          </a>
        </div>
      </div>

      <div className="h3-stage" aria-hidden="true">
        <div className="h3-scene" ref={sceneRef}>
          <House members={data.memberCount} />
          <div className="h3-float f1">
            <span className="k">{t('mealRate')}</span>
            <b>{money(data.mealRate, data.currency)}</b>
          </div>
          <div className="h3-float f2">
            <span className="k">{t('todayMenu')}</span>
            <b>{menu ? menu.lunch || menu.dinner : t('noMenu')}</b>
          </div>
          <div className="h3-float f3">
            <span className="k">💡</span>
            <b>
              {n2(data.memberCount)} {t('lightsMembers')}
            </b>
          </div>
        </div>
      </div>
    </section>
  );
}
