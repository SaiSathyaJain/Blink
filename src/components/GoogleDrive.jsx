import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, Share2, LogOut, ExternalLink, File, FileText, Image, Video, Music, Archive } from 'lucide-react';
import { useGoogleToken } from '../hooks/useGoogleToken';
import ShareToChannelModal from './ShareToChannelModal';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const MIME_ICONS = {
  'application/vnd.google-apps.document': { icon: FileText, color: '#4285f4', label: 'Doc' },
  'application/vnd.google-apps.spreadsheet': { icon: FileText, color: '#0f9d58', label: 'Sheet' },
  'application/vnd.google-apps.presentation': { icon: FileText, color: '#f4b400', label: 'Slides' },
  'application/vnd.google-apps.form': { icon: FileText, color: '#7c4dff', label: 'Form' },
  'application/pdf': { icon: File, color: '#ea4335', label: 'PDF' },
  'image/': { icon: Image, color: '#34a853', label: 'Image' },
  'video/': { icon: Video, color: '#ea4335', label: 'Video' },
  'audio/': { icon: Music, color: '#f4b400', label: 'Audio' },
  'application/zip': { icon: Archive, color: '#795548', label: 'ZIP' },
};

function getFileIcon(mimeType) {
  if (!mimeType) return { icon: File, color: '#9e9e9e', label: 'File' };
  const exact = MIME_ICONS[mimeType];
  if (exact) return exact;
  for (const [prefix, val] of Object.entries(MIME_ICONS)) {
    if (mimeType.startsWith(prefix)) return val;
  }
  return { icon: File, color: '#9e9e9e', label: 'File' };
}

function formatSize(bytes) {
  if (!bytes) return '';
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const h = diff / 3600000;
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${Math.floor(h)}h ago`;
  if (h < 168) return `${Math.floor(h / 24)}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function GoogleDrive({ channels, dms, onShareToChannel }) {
  const { token, loading: tokenLoading, error: tokenError, requestToken, revoke } = useGoogleToken(DRIVE_SCOPE);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [shareTarget, setShareTarget] = useState(null);
  const [shareSuccess, setShareSuccess] = useState('');

  const fetchFiles = useCallback(async (q = '') => {
    if (!token) return;
    setLoading(true);
    try {
      const qParam = q.trim()
        ? `name contains '${q.trim().replace(/'/g, "\\'")}' and trashed = false`
        : 'trashed = false';
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qParam)}&orderBy=modifiedTime desc&pageSize=40&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,owners)`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch { }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  useEffect(() => {
    const t = setTimeout(() => fetchFiles(query), 400);
    return () => clearTimeout(t);
  }, [query, fetchFiles]);

  const handleShare = (channel) => {
    const f = shareTarget;
    const text = `📁 **${f.name}**\n${f.webViewLink || ''}`;
    onShareToChannel(channel, text);
    setShareTarget(null);
    setShareSuccess(`Shared to ${channel.name || channel.other_user_name}`);
    setTimeout(() => setShareSuccess(''), 3000);
  };

  if (!token) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', padding: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #4285f4, #34a853)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="34" height="34" viewBox="0 0 87.3 78" fill="white">
            <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
            <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 00-1.2 4.5h27.5z" fill="#00ac47"/>
            <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.5z" fill="#ea4335"/>
            <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.85 0H34.45c-1.65 0-3.2.4-4.55 1.2z" fill="#00832d"/>
            <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.55 1.2h50.7c1.65 0 3.2-.4 4.55-1.2z" fill="#2684fc"/>
            <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28H87.3c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.375rem' }}>Connect Google Drive</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Browse and share your files without leaving Blink</p>
        </div>
        {tokenError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{tokenError}</p>}
        <button onClick={requestToken} disabled={tokenLoading}
          style={{ padding: '0.75rem 2rem', borderRadius: 12, background: 'linear-gradient(135deg, #4285f4, #34a853)', color: 'white', fontWeight: 700, fontSize: '0.9375rem', border: 'none', cursor: tokenLoading ? 'not-allowed' : 'pointer', opacity: tokenLoading ? 0.7 : 1 }}>
          {tokenLoading ? 'Connecting…' : 'Connect Drive'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      {/* Header */}
      <header className="header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg width="22" height="20" viewBox="0 0 87.3 78">
            <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
            <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 00-1.2 4.5h27.5z" fill="#00ac47"/>
            <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.5z" fill="#ea4335"/>
            <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.85 0H34.45c-1.65 0-3.2.4-4.55 1.2z" fill="#00832d"/>
            <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.55 1.2h50.7c1.65 0 3.2-.4 4.55-1.2z" fill="#2684fc"/>
            <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28H87.3c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
          </svg>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Google Drive</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {shareSuccess && <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>{shareSuccess}</span>}
          <button onClick={() => fetchFiles(query)} className="text-muted" title="Refresh"><RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /></button>
          <button onClick={revoke} className="text-muted" title="Disconnect Drive"><LogOut size={16} /></button>
        </div>
      </header>

      {/* Search */}
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search files…"
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading files…</div>}
        {!loading && files.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No files found</div>}
        {!loading && files.map(file => {
          const { icon: Icon, color, label } = getFileIcon(file.mimeType);
          return (
            <div key={file.id}
              style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-chat)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{file.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
                  <span>{label}</span>
                  {file.size && <span>· {formatSize(file.size)}</span>}
                  <span>· {timeAgo(file.modifiedTime)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {file.webViewLink && (
                  <a href={file.webViewLink} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-chat)' }}
                    title="Open in Drive">
                    <ExternalLink size={13} />
                  </a>
                )}
                <button onClick={() => setShareTarget(file)} title="Share to channel"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-chat)', cursor: 'pointer' }}>
                  <Share2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {shareTarget && (
        <ShareToChannelModal channels={channels} dms={dms} onShare={handleShare} onClose={() => setShareTarget(null)} />
      )}
    </div>
  );
}
