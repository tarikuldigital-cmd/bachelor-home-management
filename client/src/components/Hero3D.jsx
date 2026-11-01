import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { t, n2, getLang } from '../lib/i18n.js';
import { money, monthLabel } from '../lib/util.js';

// Wise words & daily-life advice: food habits, rules, lifestyle.
// Each slide has its own illustration and colour theme.
export const SLIDES = [
  { icon: '⏰', side: ['📅', '✅'], c: ['#fff4d6', '#f59e0b', '#b45309'], bn: 'সময়ের এক ফোঁড়, অসময়ের দশ ফোঁড়।', en: 'A stitch in time saves nine.', by: ['বাংলা প্রবাদ', 'Proverb'] },
  { icon: '🌅', side: ['🛏️', '☀️'], c: ['#ffe8dc', '#f97316', '#c2410c'], bn: 'আগে ঘুমাতে যাও, ভোরে ওঠো — এতে মানুষ সুস্থ, সমৃদ্ধ আর জ্ঞানী হয়।', en: 'Early to bed and early to rise makes a man healthy, wealthy, and wise.', by: ['বেঞ্জামিন ফ্র্যাংকলিন', 'Benjamin Franklin'] },
  { icon: '🍽️', side: ['🍚', '💧'], c: ['#e3f6ec', '#10b981', '#047857'], bn: 'পেটের এক ভাগ খাবারের জন্য, এক ভাগ পানির জন্য, আর এক ভাগ শ্বাসের জন্য রাখো।', en: 'Keep a third of the stomach for food, a third for water and a third for breath.', by: ['হাদিস, তিরমিযি', 'Hadith, Tirmidhi'] },
  { icon: '💧', side: ['🥛', '🌿'], c: ['#dff2ff', '#0ea5e9', '#0369a1'], bn: 'দিনে অন্তত ৮ গ্লাস পানি পান করুন — শরীর থাকবে সতেজ, মাথা থাকবে ঠান্ডা।', en: 'Drink at least 8 glasses of water a day to stay fresh and clear-headed.', by: ['স্বাস্থ্য পরামর্শ', 'Health tip'] },
  { icon: '🥗', side: ['🥕', '🫘'], c: ['#eaf7d9', '#65a30d', '#3f6212'], bn: 'প্রতিদিন ভাতের সাথে সবজি আর ডাল রাখুন; তেলে ভাজা খাবার কমান।', en: 'Have vegetables and dal with your rice every day, and cut down on fried food.', by: ['স্বাস্থ্য পরামর্শ', 'Health tip'] },
  { icon: '🧼', side: ['✨', '🧹'], c: ['#e9f0ff', '#6366f1', '#4338ca'], bn: 'পবিত্রতা ঈমানের অর্ধেক।', en: 'Cleanliness is half of faith.', by: ['হাদিস, সহিহ মুসলিম', 'Hadith, Sahih Muslim'] },
  { icon: '🔁', side: ['📈', '🏆'], c: ['#f3e8ff', '#a855f7', '#7e22ce'], bn: 'আমরা বারবার যা করি, আমরা তা-ই। শ্রেষ্ঠত্ব একবারের কাজ নয়, একটা অভ্যাস।', en: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', by: ['উইল ডুরান্ট', 'Will Durant'] },
  { icon: '🚶', side: ['👟', '🌳'], c: ['#dcfce7', '#22c55e', '#15803d'], bn: 'প্রতিদিন অন্তত ৩০ মিনিট হাঁটুন — শরীর আর মন দুটোই ভালো থাকবে।', en: 'Walk at least 30 minutes a day — good for body and mind.', by: ['স্বাস্থ্য পরামর্শ', 'Health tip'] },
  { icon: '😴', side: ['🌙', '⭐'], c: ['#e0e7ff', '#4f46e5', '#3730a3'], bn: 'রাতের খাবার ঘুমের অন্তত ২ ঘণ্টা আগে খান, আর ৭–৮ ঘণ্টা ঘুমান।', en: 'Eat dinner at least 2 hours before bed and sleep 7–8 hours.', by: ['স্বাস্থ্য পরামর্শ', 'Health tip'] },
  { icon: '💪', side: ['❤️', '🍎'], c: ['#ffe4e6', '#f43f5e', '#be123c'], bn: 'স্বাস্থ্যই সকল সুখের মূল।', en: 'Health is the root of all happiness.', by: ['বাংলা প্রবাদ', 'Proverb'] },
  { icon: '🤝', side: ['🏠', '🙂'], c: ['#fef3c7', '#d97706', '#92400e'], bn: 'একসাথে থাকার সৌন্দর্য একে অপরের প্রতি সম্মান আর সময়মতো দায়িত্ব পালনে।', en: 'Living together works when we respect each other and do our part on time.', by: ['Bachelor Home', 'Bachelor Home'] },
];

function Slide({ s, pos }) {
  return (
    <div className={`hs-card p${pos}`} style={{ '--c1': s.c[0], '--c2': s.c[1], '--c3': s.c[2] }}>
      <span className="hs-blob b1" />
      <span className="hs-blob b2" />
      <span className="hs-icon">{s.icon}</span>
      <span className="hs-side s1">{s.side[0]}</span>
      <span className="hs-side s2">{s.side[1]}</span>
    </div>
  );
}

export function Hero3D({ data, month, user }) {
  const stageRef = useRef(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const lang = getLang();
  const n = SLIDES.length;

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const iv = setInterval(() => setI((x) => (x + 1) % n), 5500);
    return () => clearInterval(iv);
  }, [paused, n]);

  // tilt the 3D stage with pointer (desktop) or phone orientation
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const set = (rx, ry) => {
      el.style.setProperty('--rx', `${rx}deg`);
      el.style.setProperty('--ry', `${ry}deg`);
    };
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      set(((e.clientY - r.top) / r.height - 0.5) * -16, ((e.clientX - r.left) / r.width - 0.5) * 24);
    };
    const onLeave = () => set(0, 0);
    const onTilt = (e) => e.gamma != null && set(Math.max(-12, Math.min(12, ((e.beta || 45) - 45) * -0.3)), Math.max(-18, Math.min(18, e.gamma * 0.6)));
    const host = el.closest('.h3');
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    window.addEventListener('deviceorientation', onTilt);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('deviceorientation', onTilt);
    };
  }, []);

  const s = SLIDES[i];
  const L = lang === 'en' ? 1 : 0;
  const rateBox = (
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
  );
  const cta = (
    <div className="row h3-cta">
      <Link className="btn primary h3-btn" to={user ? '/app' : '/login'}>
        {user ? t('goDashboard') : t('loginToAccount')}
      </Link>
      <a className="btn h3-btn" href="#this-month">
        {t('seeThisMonth')}
      </a>
    </div>
  );

  return (
    <>
      <section className="h3" style={{ '--c1': s.c[0], '--c2': s.c[1], '--c3': s.c[2] }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="h3-copy">
          <div className="h3-mess">
            {data.messName}
            {data.address ? <span className="muted"> · {data.address}</span> : null}
          </div>
          <blockquote className="h3-quote" aria-live="polite" key={i}>
            <p className={`h3-title ${s[L === 1 ? 'en' : 'bn'].length > 70 ? 'long' : ''}`}>{L === 1 ? s.en : s.bn}</p>
            <footer className="h3-by">— {s.by[L]}</footer>
          </blockquote>
          <div className="h3-dots" role="tablist" aria-label={t('wiseWords')}>
            {SLIDES.map((x, k) => (
              <button key={k} className={k === i ? 'on' : ''} aria-label={`${k + 1}`} onClick={() => setI(k)} />
            ))}
          </div>
          <div className="only-desktop-hero">
            {rateBox}
            {cta}
          </div>
        </div>

        <div className="h3-stage" ref={stageRef} aria-hidden="true">
          <div className="hs-deck">
            {SLIDES.map((x, k) => {
              const off = (k - i + n) % n;
              const pos = off === 0 ? 0 : off === 1 ? 1 : off === 2 ? 2 : off === n - 1 ? -1 : 9;
              return pos === 9 ? null : <Slide key={k} s={x} pos={pos === -1 ? 'm1' : pos} />;
            })}
          </div>
        </div>
      </section>
      <div className="only-mobile-hero">
        {rateBox}
        {cta}
      </div>
    </>
  );
}
