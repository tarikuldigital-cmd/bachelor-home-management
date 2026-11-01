import { api } from '../lib/api.js';
import { t } from '../lib/i18n.js';
import { timeAgo } from '../lib/util.js';
import { Spinner, useApi, Empty } from '../components/ui.jsx';

const ICON = { meal: '🍛', bazar: '🛒', deposit: '💰', bill: '🧾', duty: '🧺', menu: '👨‍🍳', due: '⚠️', member: '👥', notice: '📢', info: 'ℹ️' };

export default function Notifications() {
  const { data, loading, reload } = useApi(() => api('notifications'), []);
  if (loading && !data) return <Spinner />;
  return (
    <div className="card">
      <div className="card-head">
        <h3>🔔 {t('notifications')}</h3>
        <button
          className="btn sm"
          onClick={async () => {
            await api('markNotificationsRead');
            reload();
          }}
        >
          ✓ {t('markRead')}
        </button>
      </div>
      {data?.length ? (
        data.map((n) => (
          <div className="list-item" key={n.id} style={{ opacity: n.read ? 0.65 : 1 }}>
            <span style={{ fontSize: 20 }}>{ICON[n.kind] || '🔔'}</span>
            <div className="grow">
              <div className={n.read ? '' : 'bold'}>{n.text}</div>
              <div className="tiny muted">{timeAgo(n.date)}</div>
            </div>
            {!n.read && <span className="badge green">new</span>}
          </div>
        ))
      ) : (
        <Empty />
      )}
    </div>
  );
}
