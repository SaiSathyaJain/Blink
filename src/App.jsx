import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';

const API = 'https://blinkv2.saisathyajain.workers.dev';

const App = () => {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('chat');
  const [currentChannel, setCurrentChannel] = useState(null);
  const [channels, setChannels] = useState([]);
  const [dms, setDms] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [theme, setTheme] = useState(() => localStorage.getItem('blink_theme') || 'light');
  const lastReadRef = useRef({});

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
      return [dm, ...prev];
    });
    handleSelectChannel(dm);
  }, [handleSelectChannel]);

  const handleNewMessage = useCallback((channelId) => {
    if (channelId !== currentChannel?.id) {
      setUnreadCounts(prev => ({ ...prev, [channelId]: (prev[channelId] || 0) + 1 }));
    }
  }, [currentChannel?.id]);

  const handleLogin = (u) => {
    setUser(u);
    lastReadRef.current = {};
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-container">
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
        ) : currentView === 'admin' && (user.role === 'OWNER' || user.role === 'ADMIN') ? (
          <AdminPanel />
        ) : null}
      </main>
    </div>
  );
};

export default App;
