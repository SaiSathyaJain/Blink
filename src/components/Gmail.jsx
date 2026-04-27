import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Compose, Mail, Send, X, ChevronLeft, Share2, LogOut, Pencil } from 'lucide-react';
import { useGoogleToken } from '../hooks/useGoogleToken';
import ShareToChannelModal from './ShareToChannelModal';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';

function decodeBase64(str) {
  try { return decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/')))); } catch { return ''; }
}

function getHeader(headers, name) {
  return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

function getBody(payload) {
  if (!payload) return '';
  if (payload.body?.data) return decodeBase64(payload.body.data);
  if (payload.parts) {
    const html = payload.parts.find(p => p.mimeType === 'text/html');
    if (html?.body?.data) return decodeBase64(html.body.data);
    const text = payload.parts.find(p => p.mimeType === 'text/plain');
    if (text?.body?.data) return decodeBase64(text.body.data);
    // nested multipart
    for (const part of payload.parts) {
      const nested = getBody(part);
      if (nested) return nested;
    }
  }
  return '';
}

function buildRFC2822(to, subject, body, fromName, fromEmail) {
  const msg = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\r\n');
  return btoa(unescape(encodeURIComponent(msg))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const h = diff / 3600000;
  if (h < 1) return `${Math.floor(diff / 60000)}m`;
  if (h < 24) return `${Math.floor(h)}h`;
  if (h < 168) return `${Math.floor(h / 24)}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Gmail({ user, channels, dms, onShareToChannel }) {
  const { token, loading: tokenLoading, error: tokenError, requestToken, revoke } = useGoogleToken(GMAIL_SCOPE);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedFull, setSelectedFull] = useState(null);
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [shareTarget, setShareTarget] = useState(null); // message to share
  const [shareSuccess, setShareSuccess] = useState('');

  const fetchInbox = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const listRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=30',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const listData = await listRes.json();
      if (!listData.messages) { setMessages([]); setLoading(false); return; }

      // Batch fetch with full format but only needed fields
      const details = await Promise.all(
        listData.messages.map(m =>
          fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full&fields=id,threadId,snippet,labelIds,payload/headers`,
            { headers: { Authorization: `Bearer ${token}` } }
          ).then(r => r.json())
        )
      );
      setMessages(details);
    } catch { }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  const openMessage = useCallback(async (msg) => {
    setSelected(msg);
    setSelectedFull(null);
    try {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const full = await res.json();
      setSelectedFull(full);
    } catch { }
  }, [token]);

  const sendEmail = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) return;
    setSending(true);
    try {
      const raw = buildRFC2822(composeTo, composeSubject, composeBody, user.full_name, user.email);
      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });
      setComposing(false);
      setComposeTo(''); setComposeSubject(''); setComposeBody('');
    } catch { }
    setSending(false);
  };

  const handleShare = (channel) => {
    const msg = shareTarget;
    const from = getHeader(msg.payload?.headers, 'From');
    const subject = getHeader(msg.payload?.headers, 'Subject');
    const snippet = msg.snippet || '';
    const text = `📧 **${subject}**\nFrom: ${from}\n${snippet.slice(0, 200)}`;
    onShareToChannel(channel, text);
    setShareTarget(null);
    setShareSuccess(`Shared to ${channel.name || channel.other_user_name}`);
    setTimeout(() => setShareSuccess(''), 3000);
  };

  if (!token) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', padding: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #ea4335, #fbbc05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="white"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.375rem' }}>Connect Gmail</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Access your inbox without leaving Blink</p>
        </div>
        {tokenError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{tokenError}</p>}
        <button onClick={requestToken} disabled={tokenLoading}
          style={{ padding: '0.75rem 2rem', borderRadius: 12, background: 'linear-gradient(135deg, #ea4335, #fbbc05)', color: 'white', fontWeight: 700, fontSize: '0.9375rem', border: 'none', cursor: tokenLoading ? 'not-allowed' : 'pointer', opacity: tokenLoading ? 0.7 : 1 }}>
          {tokenLoading ? 'Connecting…' : 'Connect Gmail'}
        </button>
      </div>
    );
  }

  const body = selectedFull ? getBody(selectedFull.payload) : '';
  const isHtml = body.startsWith('<') || body.includes('</');
  const detailHeaders = selectedFull?.payload?.headers || selected?.payload?.headers || [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      {/* Header */}
      <header className="header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {selected && (
            <button onClick={() => { setSelected(null); setSelectedFull(null); }} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: 8, backgroundColor: 'var(--primary-light)' }}>
              <ChevronLeft size={15} /> Back
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24"><path fill="#ea4335" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Gmail</h2>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {shareSuccess && <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>{shareSuccess}</span>}
          <button onClick={() => setComposing(true)} title="Compose"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.375rem 0.75rem', borderRadius: 10, background: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: '0.8125rem', border: 'none', cursor: 'pointer' }}>
            <Pencil size={13} /> Compose
          </button>
          <button onClick={fetchInbox} className="text-muted" title="Refresh"><RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /></button>
          <button onClick={revoke} className="text-muted" title="Disconnect Gmail"><LogOut size={16} /></button>
        </div>
      </header>

      {/* Email list / detail */}
      {!selected ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading inbox…</div>}
          {!loading && messages.map(msg => {
            const from = getHeader(msg.payload?.headers, 'From');
            const subject = getHeader(msg.payload?.headers, 'Subject');
            const date = getHeader(msg.payload?.headers, 'Date');
            const unread = msg.labelIds?.includes('UNREAD');
            const fromName = from.replace(/<.*>/, '').trim() || from;
            return (
              <div key={msg.id} onClick={() => openMessage(msg)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', backgroundColor: unread ? 'var(--bg-main)' : 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-chat)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = unread ? 'var(--bg-main)' : 'transparent'}>
                <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, color: 'var(--primary)', fontSize: '0.875rem' }}>
                  {(fromName[0] || '?').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontWeight: unread ? 700 : 500, fontSize: '0.875rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{fromName}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(date)}</span>
                  </div>
                  <div style={{ fontWeight: unread ? 600 : 400, fontSize: '0.8125rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{subject || '(no subject)'}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.snippet}</div>
                </div>
                {unread && <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--primary)', flexShrink: 0, marginTop: 6 }} />}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                {getHeader(detailHeaders, 'Subject') || '(no subject)'}
              </h3>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span><strong style={{ color: 'var(--text-main)' }}>From:</strong> {getHeader(detailHeaders, 'From')}</span>
                <span><strong style={{ color: 'var(--text-main)' }}>To:</strong> {getHeader(detailHeaders, 'To')}</span>
                <span><strong style={{ color: 'var(--text-main)' }}>Date:</strong> {getHeader(detailHeaders, 'Date')}</span>
              </div>
            </div>
            <button onClick={() => setShareTarget(selected)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.375rem 0.75rem', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--text-main)', backgroundColor: 'var(--bg-chat)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0, marginLeft: '1rem' }}>
              <Share2 size={13} /> Share
            </button>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            {!selectedFull ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
            ) : isHtml ? (
              <iframe srcDoc={body} style={{ width: '100%', border: 'none', minHeight: 400, borderRadius: 10, backgroundColor: 'white' }}
                sandbox="allow-same-origin" title="Email body" onLoad={e => {
                  try { e.target.style.height = e.target.contentDocument.body.scrollHeight + 'px'; } catch { }
                }} />
            ) : (
              <pre style={{ fontFamily: 'inherit', fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{body}</pre>
            )}
          </div>
        </div>
      )}

      {/* Compose modal */}
      {composing && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: '100%', maxWidth: 520, backgroundColor: 'var(--bg-chat)', borderRadius: 20, padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>New Message</h3>
              <button onClick={() => setComposing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            {['To', 'Subject'].map((label, i) => (
              <div key={label} style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
                <input value={i === 0 ? composeTo : composeSubject}
                  onChange={e => i === 0 ? setComposeTo(e.target.value) : setComposeSubject(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Message</label>
              <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={8}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <button onClick={sendEmail} disabled={sending || !composeTo.trim() || !composeSubject.trim()}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 12, background: 'linear-gradient(135deg, #ea4335, #fbbc05)', color: 'white', fontWeight: 700, fontSize: '0.9375rem', border: 'none', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {shareTarget && (
        <ShareToChannelModal channels={channels} dms={dms} onShare={handleShare} onClose={() => setShareTarget(null)} />
      )}
    </div>
  );
}
