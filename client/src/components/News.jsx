import { useEffect, useState } from 'react';
import { t, getLang } from '../lib/i18n.js';

// Headlines are collected every 3 hours by GitHub Actions into news.json (see scripts/fetch-news.mjs).
const PUBLIC_NEWS = 'https://tarikuldigital-cmd.github.io/bachelor-home-management/news.json';
const newsUrl = () => window.__NEWS_URL || (window.Capacitor || /localhost|127\.0\.0\.1/.test(location.hostname) ? PUBLIC_NEWS : './news.json');

function ago(iso) {
  if (!iso) return '';
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  const bn = getLang() === 'bn';
  if (m < 60) return bn ? `${m} মিনিট আগে` : `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return bn ? `${h} ঘণ্টা আগে` : `${h} h ago`;
  const d = Math.round(h / 24);
  return bn ? `${d} দিন আগে` : `${d} d ago`;
}

export function NewsButton() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [src, setSrc] = useState('all');

  useEffect(() => {
    if (!open || data) return;
    fetch(newsUrl() + '?t=' + Math.floor(Date.now() / 600000))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(setData)
      .catch(() => setErr(t('newsError')));
  }, [open, data]);

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const name = (id) => data?.sources?.find((s) => s.id === id)?.name || id;
  const list = (data?.items || []).filter((x) => src === 'all' || x.source === src).slice(0, 60);

  return (
    <>
      <button className="news-fab" onClick={() => setOpen(true)} aria-label={t('readNews')}>
        📰 <span>{t('readNews')}</span>
      </button>
      {open && (
        <>
          <div className="drawer-bg" onClick={() => setOpen(false)} />
          <aside className="news-panel" role="dialog" aria-label={t('readNews')}>
            <div className="news-head">
              <div>
                <h3>📰 {t('todayNews')}</h3>
                {data?.updated && (
                  <div className="tiny muted">
                    {t('updated')}: {ago(data.updated)}
                  </div>
                )}
              </div>
              <button className="btn ghost icon-btn" onClick={() => setOpen(false)} aria-label="close">
                ✕
              </button>
            </div>
            {data?.sources?.length > 0 && (
              <div className="news-chips">
                <button className={src === 'all' ? 'on' : ''} onClick={() => setSrc('all')}>
                  {t('allSources')}
                </button>
                {data.sources.map((s) => (
                  <button key={s.id} className={src === s.id ? 'on' : ''} onClick={() => setSrc(s.id)}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            <div className="news-list">
              {!data && !err && <div className="spinner" />}
              {err && <div className="empty">{err}</div>}
              {data && !list.length && <div className="empty">{t('newsEmpty')}</div>}
              {list.map((x) => (
                <a key={x.link} className="news-item" href={x.link} target="_blank" rel="noopener noreferrer">
                  <span className="news-title">{x.title}</span>
                  <span className="tiny muted">
                    {name(x.source)}
                    {x.time ? ` · ${ago(x.time)}` : ''}
                  </span>
                </a>
              ))}
            </div>
            <div className="tiny muted news-foot">{t('newsNote')}</div>
          </aside>
        </>
      )}
    </>
  );
}
