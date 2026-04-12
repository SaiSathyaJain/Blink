import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';

const App = () => {
  const [user, setUser] = useState(null); // Simple auth state
  const [currentView, setCurrentView] = useState('chat'); // 'chat' or 'admin'
  const [currentChannel, setCurrentChannel] = useState({ id: 'engineering', name: 'engineering' });
  const [channels, setChannels] = useState([
    { id: 'general', name: 'general' },
    { id: 'engineering', name: 'engineering' },
    { id: 'design', name: 'design' },
    { id: 'random', name: 'random' },
  ]);

  // Mock checking session
  useEffect(() => {
    const savedUser = localStorage.getItem('blink_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="app-container">
      <Sidebar 
        currentView={currentView}
        currentChannel={currentChannel}
        onSelectChannel={(ch) => {
            setCurrentChannel(ch);
            setCurrentView('chat');
        }}
        onViewChange={setCurrentView}
        user={user}
      />
      
      <main className="main-content">
        {currentView === 'chat' ? (
          <ChatArea channel={currentChannel} user={user} />
        ) : (
          <AdminPanel />
        )}
      </main>
    </div>
  );
};

export default App;
