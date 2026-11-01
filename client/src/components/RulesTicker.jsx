import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { t, getLang } from '../lib/i18n.js';
import { money, monthLabel } from '../lib/util.js';

// Scrolling notice bar inside the member panel only (not on the public home page):
// the member's own due reminder first, then the mess rules.
export function RulesTicker({ path }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let live = true;
    Promise.all([api('memberDetail', {}), api('publicSummary', {})])
      .then(([d, pub]) => {
        if (!live) return;
        const lang = getLang();
        const out = [];
        const s = d.stats;
        if (s && (s.mealDue > 0 || s.serviceDue > 0)) {
          const parts = [];
          if (s.mealDue > 0) parts.push(`${t('mealDue')} ${money(s.mealDue)}`);
          if (s.serviceDue > 0) parts.push(`${t('serviceDue')} ${money(s.serviceDue)}`);
          out.push({ kind: 'due', text: `${t('tickerDue')} (${monthLabel(d.month)}): ${parts.join(' · ')}` });
        }
        (pub.rules || []).forEach((r) => {
          const text = (lang === 'bn' ? r.bn : r.en) || r.en || r.bn;
          if (text) out.push({ kind: 'rule', text });
        });
        setItems(out);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [path]);

  if (!items.length) return null;
  const hasDue = items[0].kind === 'due';
  const row = (k) =>
    items.map((it, i) => (
      <span key={`${k}-${i}`} className={`tk-item ${it.kind}`}>
        {it.kind === 'due' ? '⚠️' : '📌'} {it.text}
      </span>
    ));
  // speed scales with text length so it reads at the same pace
  const len = items.reduce((a, x) => a + x.text.length, 0);
  const dur = Math.max(30, Math.round(len / 7));

  return (
    <div className={`ticker ${hasDue ? 'has-due' : ''}`} role="marquee" aria-label={t('messRules')}>
      <Link to={hasDue ? '/app/profile' : '/app/settings'} className="tk-tag">
        {hasDue ? `⚠️ ${t('important')}` : `📜 ${t('messRules')}`}
      </Link>
      <div className="tk-viewport">
        <div className="tk-track" style={{ animationDuration: `${dur}s` }}>
          {row('a')}
          {row('b')}
        </div>
      </div>
    </div>
  );
}
