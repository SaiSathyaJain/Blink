import React, { useState, useEffect, useCallback } from 'react';
import { Inbox as InboxIcon, MessageCircle, Bell, RefreshCw } from 'lucide-react';

const API = 'https://blinkv2.saisathyajain.workers.dev';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Avatar({ name, avatarUrl, size = 40, online }) {
  return avatarUrl ? (
    <img src={avatarUrl} alt="" style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: 10, backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: 'var(--primary)', flexShrink: 0, position: 'relative' }}>
      {(name || '?')[0].toUpperCase()}
      {online !== undefined && (
        <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', backgroundColor: online ? '#10b981' : '#94a3b8', border: '2px solid var(--bg-chat)' }} />
      )}
    </div>
  );
}

export default function Inbox({ user, onSelectChannel, unreadCounts }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('messages');

  const load = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('blink_token');
    try {
      const res = await fetch(`${API}/api/inbox`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setData(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const conversations = data?.conversations || [];
  const notifications = data?.notifications || [];
  const totalUnread = conversations.reduce((sum, c) => sum + (unreadCounts?.[c.id] || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-main)' }}>

      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-chat)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <InboxIcon size={20} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', margin: 0 }}>Inbox</h2>
          {totalUnread > 0 && (
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 700, padding: '2px 7px' }}>
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
        <button onClick={load} className="text-muted" title="Refresh" style={{ display: 'flex' }}>
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-chat)', padding: '0 1.5rem' }}>
        {[
          { key: 'messages', label: 'Messages', icon: <MessageCircle size={14} />, badge: totalUnread },
          { key: 'notifications', label: 'Notifications', icon: <Bell size={14} />, badge: notifications.length },
        ].map(({ key, label, icon, badge }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: tab === key ? 700 : 500, color: tab === key ? 'var(--primary)' : 'var(--text-muted)', borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: -1, background: 'none', transition: 'color 0.15s' }}>
            {icon} {label}
            {badge > 0 && (
              <span style={{ backgroundColor: tab === key ? 'var(--primary)' : 'var(--text-muted)', color: 'white', borderRadius: '999px', fontSize: '0.625rem', fontWeight: 700, padding: '1px 5px' }}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {!loading && tab === 'messages' && (
          <>
            {conversations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                <MessageCircle size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p style={{ fontWeight: 600, margin: 0 }}>No messages yet</p>
                <p style={{ fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>Start a direct message from the sidebar</p>
              </div>
            )}
            {conversations.map(conv => {
              const unread = unreadCounts?.[conv.id] || 0;
              const isOnline = conv.other_user_status === 'ONLINE';
              return (
                <button key={conv.id} onClick={() => onSelectChannel(conv)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.5rem', background: 'none', textAlign: 'left', borderBottom: '1px solid var(--border)', transition: 'background-color 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-chat)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <Avatar name={conv.other_user_name} avatarUrl={conv.other_user_avatar} online={isOnline} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: '0.9375rem', color: 'var(--text-main)' }}>{conv.other_user_name}</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '0.5rem' }}>{timeAgo(conv.last_timestamp)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <p style={{ fontSize: '0.8125rem', color: unread > 0 ? 'var(--text-main)' : 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: unread > 0 ? 600 : 400 }}>
                        {conv.last_user_id === user.id ? <span style={{ color: 'var(--text-muted)' }}>You: </span> : null}
                        {conv.last_preview || <span style={{ fontStyle: 'italic' }}>No messages yet</span>}
                      </p>
                      {unread > 0 && (
                        <span style={{ flexShrink: 0, minWidth: 18, height: 18, backgroundColor: 'var(--primary)', color: 'white', borderRadius: '999px', fontSize: '0.625rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}

        {!loading && tab === 'notifications' && (
          <>
            {notifications.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                <Bell size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p style={{ fontWeight: 600, margin: 0 }}>No notifications yet</p>
                <p style={{ fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>Nexus task assignments will appear here</p>
              </div>
            )}
            {notifications.map(notif => (
              <button key={notif.id} onClick={() => onSelectChannel({ id: notif.channel_id, type: 'DM' })}
                style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '1rem 1.5rem', background: 'none', textAlign: 'left', borderBottom: '1px solid var(--border)', transition: 'background-color 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-chat)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>Nexus · Task Assigned</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '0.5rem' }}>{timeAgo(notif.timestamp)}</span>
                  </div>
                  {notif.nexusData ? (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600 }}>{notif.nexusData.taskTitle}</span>
                      <span style={{ color: 'var(--text-muted)' }}> · {notif.nexusData.projectName}</span>
                    </div>
                  ) : null}
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    Assigned by {notif.sender_name}
                  </p>
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
