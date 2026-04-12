import React, { useState, useEffect, useRef } from 'react';
import { 
  Paperclip, 
  Image as ImageIcon, 
  AtSign, 
  Smile, 
  Send, 
  Search, 
  Users, 
  Pin, 
  Info,
  Download,
  Hash,
  File
} from 'lucide-react';

import FileModal from './FileModal';
import ProfileSidebar from './ProfileSidebar';

const ChatArea = ({ channel, user }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [ws, setWs] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    // Initial messages fetch
    const fetchHistory = async () => {
        // Mock fetch from /api/messages/${channel.id}
        const mockHistory = [
            { 
                id: '1', 
                user_id: 'alex', 
                full_name: 'Alex Morgan', 
                content: "Hey team! I've just updated the API documentation for the new authentication flow. Let me know if you run into any issues with the updated endpoints.",
                timestamp: '10:42 AM',
                reactions: [{ icon: '🚀', count: 3 }, { icon: '✅', count: 1 }]
            },
            { 
                id: '2', 
                user_id: 'kim', 
                full_name: 'Kim Blake', 
                content: "Thanks Alex! Here's the updated deployment diagram based on those changes.",
                timestamp: '10:45 AM',
                file: { name: 'deployment-v2-final.pdf', size: '4.2 MB' }
            },
            {
                id: '3',
                user_id: 'jordan',
                full_name: 'Jordan Smith',
                content: "The new dashboard UI looks amazing in dark mode. Check out this screenshot:",
                timestamp: '10:50 AM',
                image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1000&auto=format&fit=crop'
            }
        ];
        setMessages(mockHistory);
    };

    fetchHistory();

    // Setup WebSocket (In real app, pointing to env.API_BASE_URL)
    // const socket = new WebSocket(`ws://localhost:8787/api/ws?room=${channel.id}`);
    // setWs(socket);
    // return () => socket.close();
  }, [channel]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    const newMessage = {
        id: Date.now().toString(),
        user_id: user.id,
        full_name: user.name,
        content: inputText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setInputText('');
  };

  const handleFileSend = ({ file, caption }) => {
      const newMessage = {
          id: Date.now().toString(),
          user_id: user.id,
          full_name: user.name,
          content: caption || '',
          file: { name: file.name, size: `${(file.size / 1024).toFixed(1)} KB` },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, newMessage]);
  };

  const openProfile = (u) => {
      setProfileUser(u || { name: 'Priya Sharma', username: 'priya.sharma' });
      setShowProfile(true);
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Hash size={20} className="text-muted" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{channel.name}</h2>
            <div style={{ 
                fontSize: '0.75rem', 
                backgroundColor: 'var(--primary-light)', 
                color: 'var(--primary)', 
                padding: '2px 8px', 
                borderRadius: '10px',
                marginLeft: '0.5rem'
            }}>
                12 MEMBERS
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }} className="text-muted">
              <Search size={18} />
              <button 
                onClick={() => openProfile()} 
                className="text-muted"
                style={{ display: 'flex', alignItems: 'center' }}
              >
                  <Users size={18} />
              </button>
              <Pin size={18} />
              <Info size={18} />
          </div>
        </header>

        <div className="chat-area" ref={scrollRef}>
          {messages.map(msg => (
            <div key={msg.id} className="message fade-in">
              <div 
                className="avatar" 
                style={{ cursor: 'pointer' }}
                onClick={() => openProfile({ name: msg.full_name, id: msg.user_id })}
              ></div>
              <div className="message-content">
                <div className="message-header">
                  <span className="user-name" style={{ cursor: 'pointer' }} onClick={() => openProfile({ name: msg.full_name, id: msg.user_id })}>{msg.full_name}</span>
                  <span className="timestamp">{msg.timestamp}</span>
                </div>
                <div className="text">{msg.content}</div>
                
                {msg.reactions && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {msg.reactions.map((r, i) => (
                            <div key={i} style={{ 
                                padding: '2px 6px', 
                                backgroundColor: 'var(--bg-main)', 
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                display: 'flex',
                                gap: '4px'
                            }}>
                                {r.icon} <span style={{ fontWeight: 600 }}>{r.count}</span>
                            </div>
                        ))}
                    </div>
                )}

                {msg.file && (
                    <div style={{ 
                        marginTop: '0.75rem', 
                        padding: '1rem', 
                        backgroundColor: 'var(--bg-main)', 
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        maxWidth: '400px',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            backgroundColor: 'var(--primary-light)', 
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary)'
                        }}>
                            <File size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{msg.file.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDF • {msg.file.size}</div>
                        </div>
                        <Download size={18} className="text-muted" />
                    </div>
                )}

                {msg.image && (
                    <img src={msg.image} alt="attachment" style={{ 
                        maxWidth: '100%', 
                        maxHeight: '400px', 
                        borderRadius: '12px', 
                        marginTop: '1rem',
                        border: '1px solid var(--border)'
                    }} />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="input-area">
          <div className="input-container" style={{ border: '1px solid var(--border)', padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }} className="text-muted">
              <button 
                className="text-muted"
                onClick={() => setIsModalOpen(true)}
              >
                  <Paperclip size={20} />
              </button>
              <button className="text-muted"><ImageIcon size={20} /></button>
              <button className="text-muted"><AtSign size={20} /></button>
              <button className="text-muted"><Smile size={20} /></button>
            </div>
            <textarea 
              className="message-input" 
              placeholder={`Message #${channel.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                  }
              }}
            />
            <button 
              className="send-btn" 
              onClick={handleSend}
              disabled={!inputText.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {showProfile && (
          <ProfileSidebar 
            user={profileUser} 
            onClose={() => setShowProfile(false)} 
          />
      )}

      <FileModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSend={handleFileSend}
      />
    </div>
  );
};

export default ChatArea;
