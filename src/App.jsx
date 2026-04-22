import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AdminPanel from './components/AdminPanel';
import Nexus from './components/Nexus';
import Login from './components/Login';
import ToastContainer from './components/Toast';

const API = 'https://blinkv2.saisathyajain.workers.dev';
const WS_URL = 'wss://blinkv2.saisathyajain.workers.dev';

const App = () => {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('chat');
  const [currentChannel, setCurrentChannel] = useState(null);
  const [channels, setChannels] = useState([]);
  const [dms, setDms] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [theme, setTheme] = useState(() => localStorage.getItem('blink_theme') || 'light');
  const [toasts, setToasts] = useState([]);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const lastReadRef = useRef({});
  const allChannelsRef = useRef([]);
  const currentChannelRef = useRef(null);
  const notifSocketsRef = useRef({});

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((channel, senderName, preview) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev.slice(-4), { id, channel, senderName, preview }]);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('blink_theme', theme);
  }, [theme]);

  useEffect(() => {
    const savedUser = localStorage.getItem('blink_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);


  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('blink_token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API}/api/channels`, { headers }).then(r => r.json()),
      fetch(`${API}/api/dm`, { headers }).then(r => r.json()),
    ]).then(([ch, dm]) => {
      const chArr = Array.isArray(ch) ? ch : [];
      const dmArr = Array.isArray(dm) ? dm : [];
      setChannels(chArr);
      setDms(dmArr);
      allChannelsRef.current = [...chArr, ...dmArr];
      if (chArr.length > 0 && !currentChannel) setCurrentChannel(chArr[0]);
    }).catch(() => {});
  }, [user]);

  // Fetch unread counts periodically
  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      const token = localStorage.getItem('blink_token');
      const oldest = Object.values(lastReadRef.current).reduce(
        (min, t) => (!min || t < min ? t : min),
        null
      ) || new Date(Date.now() - 3600000).toISOString();
      fetch(`${API}/api/unread?since=${encodeURIComponent(oldest)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(map => {
          if (map && typeof map === 'object') {
            setUnreadCounts(prev => {
              const next = { ...prev };
              for (const [ch, count] of Object.entries(map)) {
                if (ch !== currentChannel?.id) next[ch] = count;
              }
              return next;
            });
          }
        })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user, currentChannel?.id]);

  // Keep currentChannelRef in sync to avoid stale closure in notification WS
  useEffect(() => { currentChannelRef.current = currentChannel; }, [currentChannel]);

  // Subscribe to every channel's WS for cross-channel notifications and unread counts
  useEffect(() => {
    if (!user) return;
    const allChs = [...channels, ...dms];
    const currentIds = new Set(allChs.map(c => c.id));

    // Close sockets for channels no longer in list
    for (const [id, ws] of Object.entries(notifSocketsRef.current)) {
      if (!currentIds.has(id)) { ws.close(); delete notifSocketsRef.current[id]; }
    }

    // Open sockets for new channels
    for (const ch of allChs) {
      if (notifSocketsRef.current[ch.id]) continue;
      const ws = new WebSocket(`${WS_URL}/api/ws?room=${ch.id}`);
      ws.onopen = () => ws.send(JSON.stringify({ type: 'join', channelId: ch.id, userId: user.id }));
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'new_message') return;
          const msg = data.message;
          if (!msg || msg.user_id === user.id) return;
          const isCurrentCh = ch.id === currentChannelRef.current?.id;
          // Skip entirely only if user is actively viewing this channel (tab visible)
          if (isCurrentCh && !document.hidden) return;
          if (!isCurrentCh) setUnreadCounts(prev => ({ ...prev, [ch.id]: (prev[ch.id] || 0) + 1 }));
          if (Notification.permission === 'granted') {
            const title = ch.type === 'DM' ? msg.full_name : `#${ch.name}`;
            new Notification(title, { body: (msg.content || '').slice(0, 100), icon: '/favicon.ico' });
          }
          if (!document.hidden && !isCurrentCh) addToast(ch, msg.full_name, (msg.content || '').slice(0, 60));
        } catch {}
      };
      ws.onclose = () => { delete notifSocketsRef.current[ch.id]; };
      notifSocketsRef.current[ch.id] = ws;
    }
  }, [user?.id, channels, dms, addToast]);

  const handleSelectChannel = useCallback((ch) => {
    if (currentChannel?.id) {
      lastReadRef.current[currentChannel.id] = new Date().toISOString();
    }
    setCurrentChannel(ch);
    setCurrentView('chat');
    setUnreadCounts(prev => ({ ...prev, [ch.id]: 0 }));
  }, [currentChannel]);

  const handleCreateChannel = useCallback((newChannel) => {
    setChannels(prev => [...prev, newChannel].sort((a, b) => a.name.localeCompare(b.name)));
    handleSelectChannel(newChannel);
  }, [handleSelectChannel]);

  const handleCreateDM = useCallback((dm) => {
    setDms(prev => {
      if (prev.find(d => d.id === dm.id)) return prev;
      const next = [dm, ...prev];
      allChannelsRef.current = [...allChannelsRef.current.filter(c => c.id !== dm.id), dm];
      return next;
    });
    handleSelectChannel(dm);
  }, [handleSelectChannel]);

  const handleNewMessage = useCallback((channelId, meta) => {
    const isActive = channelId === currentChannel?.id;
    if (!isActive) {
      setUnreadCounts(prev => ({ ...prev, [channelId]: (prev[channelId] || 0) + 1 }));
    }
    if (meta?.channel) {
      addToast(meta.channel, meta.senderName, meta.preview);
    }
  }, [currentChannel?.id, addToast]);

  // Show notification banner for returning users who haven't granted permission
  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      setShowNotifBanner(true);
    }
  }, [user?.id]);

  const handleLogin = (u) => {
    setUser(u);
    lastReadRef.current = {};
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-container">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} onNavigate={handleSelectChannel} />
      {showNotifBanner && (
        <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, backgroundColor: 'var(--bg-chat)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
          <span style={{ color: 'var(--text-main)' }}>Enable desktop notifications to stay updated</span>
          <button onClick={() => { Notification.requestPermission().then(() => setShowNotifBanner(false)); }} style={{ padding: '0.375rem 0.875rem', borderRadius: '8px', backgroundColor: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: '0.8125rem' }}>Enable</button>
          <button onClick={() => setShowNotifBanner(false)} style={{ color: 'var(--text-muted)', background: 'none', fontSize: '0.8125rem' }}>Dismiss</button>
        </div>
      )}
      <Sidebar
        currentView={currentView}
        currentChannel={currentChannel}
        channels={channels}
        dms={dms}
        onSelectChannel={handleSelectChannel}
        onViewChange={setCurrentView}
        user={user}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        unreadCounts={unreadCounts}
        onCreateChannel={handleCreateChannel}
        onCreateDM={handleCreateDM}
      />
      <main className="main-content">
        {currentView === 'chat' && currentChannel ? (
          <ChatArea
            key={currentChannel.id}
            channel={currentChannel}
            user={user}
            onNewMessage={handleNewMessage}
          />
        ) : currentView === 'nexus' ? (
          <Nexus user={user} />
        ) : currentView === 'admin' && (user.role === 'OWNER' || user.role === 'ADMIN') ? (
          <AdminPanel />
        ) : null}
      </main>
    </div>
  );
};

export default App;
