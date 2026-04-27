import React, { useState } from 'react';
import { X, Hash, MessageCircle, Search } from 'lucide-react';

export default function ShareToChannelModal({ channels = [], dms = [], onShare, onClose }) {
  const [query, setQuery] = useState('');

  const filtered = (list, type) =>
    list.filter(c => {
      const name = type === 'dm' ? (c.other_user_name || '') : (c.name || '');
      return name.toLowerCase().includes(query.toLowerCase());
    });

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: '100%', maxWidth: 380, backgroundColor: 'var(--bg-chat)', borderRadius: 20, padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Share to channel</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search channels or people…"
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>

        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered(channels, 'channel').map(ch => (
            <button key={ch.id} onClick={() => onShare(ch)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.625rem', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <Hash size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>{ch.name}</span>
            </button>
          ))}
          {filtered(dms, 'dm').map(dm => (
            <button key={dm.id} onClick={() => onShare(dm)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.625rem', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <MessageCircle size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>{dm.other_user_name}</span>
            </button>
          ))}
          {filtered(channels, 'channel').length === 0 && filtered(dms, 'dm').length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>No results</p>
          )}
        </div>
      </div>
    </div>
  );
}
