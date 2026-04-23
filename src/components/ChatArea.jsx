import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  Paperclip, Image as ImageIcon, AtSign, Smile, Send, Search, Users,
  FolderOpen, Hash, File, Download, Pin, PinOff, Reply, Edit2, Trash2,
  X, Check, ChevronDown, MessageCircle, Bell, BellOff, Link2, BarChart2, Plus, Minus, Clock,
} from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import FileModal from './FileModal';
import ProfileSidebar from './ProfileSidebar';
import FileSidebar from './FileSidebar';

const API = 'https://blinkv2.saisathyajain.workers.dev';
const WS_URL = 'wss://blinkv2.saisathyajain.workers.dev';
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];
const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

// ── Markdown + emoji renderer ─────────────────────────────────────────────

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;

function extractUrls(text) {
  return text ? [...text.matchAll(URL_REGEX)].map(m => m[0]) : [];
}

function parseMarkdown(text) {
  if (!text) return '';
  let s = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const blocks = [];
  s = s.replace(/```([\s\S]*?)```/g, (_, code) => {
    const i = blocks.length;
    blocks.push(`<pre class="md-pre"><code>${code.trim()}</code></pre>`);
    return `\x00B${i}\x00`;
  });

  const codes = [];
  s = s.replace(/`([^`\n]+)`/g, (_, c) => {
    const i = codes.length;
    codes.push(`<code class="md-code">${c}</code>`);
    return `\x00C${i}\x00`;
  });

  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
  s = s.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');
  s = s.replace(/@(\w+)/g, '<span style="color:var(--primary);font-weight:600">@$1</span>');
  s = s.replace(EMOJI_REGEX, '<span class="emoji-animated">$&</span>');
  s = s.replace(/\n/g, '<br>');

  codes.forEach((c, i) => { s = s.replace(`\x00C${i}\x00`, c); });
  blocks.forEach((b, i) => { s = s.replace(`\x00B${i}\x00`, b); });
  return s;
}

function isEmojiOnly(text) {
  return !!text && text.replace(EMOJI_REGEX, '').trim() === '';
}

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFull(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function groupReactions(reactions = []) {
  const map = {};
  for (const r of reactions) {
    if (!map[r.emoji]) map[r.emoji] = [];
    map[r.emoji].push(r.user_id);
  }
  return Object.entries(map).map(([emoji, userIds]) => ({ emoji, userIds }));
}

// ── NexusCard ─────────────────────────────────────────────────────────────

const NexusCard = ({ content }) => {
  let data = null;
  try { data = JSON.parse(content); } catch { data = null; }
  if (!data) {
    return <div className="text">{content}</div>;
  }
  const { taskTitle, projectName, assignedBy } = data;
  return (
    <div style={{ marginTop: '0.5rem', maxWidth: '380px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
      <div style={{ padding: '0.5rem 0.875rem', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
        </svg>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nexus · Task Assigned</span>
      </div>
      <div style={{ padding: '0.75rem 0.875rem' }}>
        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.375rem', lineHeight: 1.3 }}>{taskTitle}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Project:</span> {projectName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Assigned by:</span> {assignedBy}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── PollMessage ───────────────────────────────────────────────────────────

const PollMessage = ({ poll, onVote }) => {
  if (!poll) return null;
  const hasVoted = !!poll.userVote;
  return (
    <div style={{ marginTop: '0.5rem', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', maxWidth: '400px', backgroundColor: 'var(--bg-main)' }}>
      <div style={{ padding: '0.75rem 1rem 0.5rem', fontWeight: 700, fontSize: '0.9375rem', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Poll</span>
        {poll.question}
      </div>
      <div style={{ padding: '0.5rem 0.75rem' }}>
        {poll.options.map(opt => {
          const pct = poll.totalVotes ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
          const isMyVote = poll.userVote === opt.id;
          return (
            <button key={opt.id} onClick={() => onVote(poll.id, opt.id)}
              style={{ display: 'block', width: '100%', position: 'relative', textAlign: 'left', padding: '0.5rem 0.625rem', borderRadius: '8px', marginBottom: '0.375rem', border: isMyVote ? '2px solid var(--primary)' : '2px solid var(--border)', overflow: 'hidden', background: 'transparent', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => { if (!isMyVote) e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseLeave={e => { if (!isMyVote) e.currentTarget.style.borderColor = 'var(--border)'; }}>
              {hasVoted && (
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, backgroundColor: isMyVote ? 'var(--primary)' : 'var(--primary-light)', opacity: isMyVote ? 0.2 : 0.4, transition: 'width 0.4s ease' }} />
              )}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: isMyVote ? 700 : 500, color: 'var(--text-main)' }}>
                  {isMyVote && <Check size={12} style={{ color: 'var(--primary)', marginRight: 4, display: 'inline' }} />}
                  {opt.text}
                </span>
                {hasVoted && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isMyVote ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>{pct}%</span>}
              </div>
            </button>
          );
        })}
        <div style={{ fontSize: '0.7375rem', color: 'var(--text-muted)', marginTop: '0.25rem', padding: '0 0.25rem' }}>
          {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''} · {hasVoted ? 'You voted' : 'Click an option to vote'}
        </div>
      </div>
    </div>
  );
};

// ── MessageItem ───────────────────────────────────────────────────────────

const MessageItem = memo(({ msg, currentUser, isAdmin, onReply, onToggleReaction, onEdit, onDelete, onPin, onUnpin, isPinned, onAvatarClick, onJump, isJumping, linkPreviews, onFetchPreview, isSeenTarget, onVotePoll }) => {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const pickerRef = useRef(null);

  const isOwn = msg.user_id === currentUser.id;
  const grouped = useMemo(() => groupReactions(msg.reactions), [msg.reactions]);
  const emojiOnly = isEmojiOnly(msg.content);

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowReactionPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent.trim() !== msg.content) onEdit(msg.id, editContent.trim());
    setIsEditing(false);
  };

  if (msg.is_deleted) {
    return (
      <div className="message">
        <div className="avatar" />
        <div className="message-content">
          <div className="message-header">
            <span className="user-name">{msg.full_name}</span>
            <span className="timestamp" title={formatFull(msg.timestamp)}>{formatTime(msg.timestamp)}</span>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>This message was deleted.</div>
        </div>
      </div>
    );
  }

  const urls = extractUrls(msg.content || '');

  return (
    <div
      className="message"
      data-message-id={msg.id}
      style={{ position: 'relative', transition: 'background-color 0.5s', backgroundColor: isJumping ? 'rgba(99,102,241,0.15)' : undefined }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowReactionPicker(false); }}
    >
      {hovered && msg.type !== 'NEXUS' && (
        <div className="message-actions">
          {QUICK_REACTIONS.map(emoji => (
            <button key={emoji} className="action-btn reaction-quick" onClick={() => onToggleReaction(msg.id, emoji)} title={emoji}>
              {emoji}
            </button>
          ))}
          <div style={{ width: 1, height: 18, backgroundColor: 'var(--border)', margin: '0 2px' }} />
          <div style={{ position: 'relative' }} ref={pickerRef}>
            <button className="action-btn" onClick={() => setShowReactionPicker(p => !p)} title="React">
              <Smile size={14} />
            </button>
            {showReactionPicker && (
              <div style={{ position: 'absolute', bottom: '2rem', right: 0, zIndex: 200 }}>
                <Picker data={data} onEmojiSelect={e => { onToggleReaction(msg.id, e.native); setShowReactionPicker(false); }} theme="light" previewPosition="none" skinTonePosition="none" />
              </div>
            )}
          </div>
          <button className="action-btn" onClick={() => onReply(msg)} title="Reply"><Reply size={14} /></button>
          {isOwn && <button className="action-btn" onClick={() => { setIsEditing(true); setEditContent(msg.content); }} title="Edit"><Edit2 size={14} /></button>}
          {(isOwn || isAdmin) && <button className="action-btn danger" onClick={() => onDelete(msg.id)} title="Delete"><Trash2 size={14} /></button>}
          {isAdmin && (
            <button className="action-btn" onClick={() => isPinned ? onUnpin(msg.id) : onPin(msg.id)} title={isPinned ? 'Unpin' : 'Pin'}>
              {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
          )}
        </div>
      )}

      {msg.type === 'NEXUS' ? (
        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
      ) : msg.avatar_url ? (
        <img src={msg.avatar_url} alt="" onClick={() => onAvatarClick({ name: msg.full_name, id: msg.user_id })}
          style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', cursor: 'pointer', flexShrink: 0 }} />
      ) : (
        <div className="avatar" style={{ cursor: 'pointer' }} onClick={() => onAvatarClick({ name: msg.full_name, id: msg.user_id })} />
      )}

      <div className="message-content">
        <div className="message-header">
          <span className="user-name" style={{ cursor: msg.type === 'NEXUS' ? 'default' : 'pointer' }}
            onClick={() => msg.type !== 'NEXUS' && onAvatarClick({ name: msg.full_name, id: msg.user_id })}>
            {msg.type === 'NEXUS' ? 'Nexus' : msg.full_name}
          </span>
          <span className="timestamp" title={formatFull(msg.timestamp)}>{formatTime(msg.timestamp)}</span>
          {msg.edited_at && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>(edited)</span>}
          {isPinned && <span title="Pinned"><Pin size={11} style={{ color: 'var(--primary)', marginLeft: 2 }} /></span>}
        </div>

        {msg.reply_to_id && (
          <div className="reply-context" style={{ cursor: 'pointer' }} onClick={() => onJump?.(msg.reply_to_id)}>
            <div style={{ width: 3, backgroundColor: 'var(--primary)', borderRadius: 2, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 1 }}>{msg.reply_user_name}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.reply_content}</div>
            </div>
          </div>
        )}

        {isEditing ? (
          <div style={{ marginTop: '0.25rem' }}>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } if (e.key === 'Escape') setIsEditing(false); }}
              style={{ width: '100%', border: '1px solid var(--primary)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.9375rem', resize: 'none', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'inherit' }}
              rows={2}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button onClick={handleSaveEdit} style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: '6px', backgroundColor: 'var(--primary)', color: 'white', fontWeight: 600 }}>Save</button>
              <button onClick={() => setIsEditing(false)} style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'transparent' }}>Cancel</button>
            </div>
          </div>
        ) : msg.type === 'POLL' ? (
          <PollMessage poll={msg.poll} onVote={onVotePoll} />
        ) : msg.type === 'NEXUS' ? (
          <NexusCard content={msg.content} />
        ) : (
          <div className={`text ${emojiOnly ? 'emoji-only' : ''}`} dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
        )}

        {msg.file && (
          <div style={{ marginTop: '0.75rem', padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '400px', border: '1px solid var(--border)' }}>
            <div style={{ width: 40, height: 40, backgroundColor: 'var(--primary-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <File size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{msg.file.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{msg.file.size}</div>
            </div>
            <Download size={18} className="text-muted" />
          </div>
        )}

        {msg.image && (
          <img src={msg.image} alt="attachment" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px', marginTop: '1rem', border: '1px solid var(--border)' }} />
        )}

        {grouped.length > 0 && (
          <div className="reactions-row">
            {grouped.map(({ emoji, userIds }) => (
              <button
                key={emoji}
                className={`reaction-pill ${userIds.includes(currentUser.id) ? 'active' : ''}`}
                onClick={() => onToggleReaction(msg.id, emoji)}
                title={`${userIds.length} reaction${userIds.length > 1 ? 's' : ''}`}
              >
                {emoji} <span>{userIds.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Link previews */}
        {urls.map(url => {
          const preview = linkPreviews?.[url];
          if (!preview) {
            if (onFetchPreview && linkPreviews && !(url in linkPreviews)) onFetchPreview(url);
            return null;
          }
          if (!preview.title) return null;
          return (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginTop: '0.5rem', maxWidth: '440px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-main)' }}>
              {preview.image && <img src={preview.image} alt="" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />}
              <div style={{ padding: '0.625rem 0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{preview.siteName}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>{preview.title}</div>
                {preview.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{preview.description}</div>}
              </div>
            </a>
          );
        })}

        {/* Read receipt */}
        {isSeenTarget && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Check size={11} /><Check size={11} style={{ marginLeft: -6 }} /> Seen
          </div>
        )}
      </div>
    </div>
  );
});

// ── ChatArea ──────────────────────────────────────────────────────────────

const ChatArea = ({ channel, user, onNewMessage }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [rateLimitError, setRateLimitError] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinned, setShowPinned] = useState(false);
  const wsRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimeouts = useRef({});
  const emojiPickerRef = useRef(null);
  const isAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const [notifPermission, setNotifPermission] = useState(() =>
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [linkPreviews, setLinkPreviews] = useState({});
  const [jumpingTo, setJumpingTo] = useState(null);
  const [readReceipts, setReadReceipts] = useState([]);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduledMsgs, setScheduledMsgs] = useState([]);
  const [showScheduled, setShowScheduled] = useState(false);
  const inputRef = useRef(null);

  const copyChannelInvite = async () => {
    const token = localStorage.getItem('blink_token');
    try {
      const res = await fetch(`${API}/api/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channelId: channel.id }),
      });
      const { code } = await res.json();
      const link = `${window.location.origin}?invite=${code}`;
      await navigator.clipboard.writeText(link);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    } catch {}
  };

  const requestNotifPermission = async () => {
    if (!('Notification' in window) || notifPermission === 'denied') return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  // Load users for @mention autocomplete
  useEffect(() => {
    const token = localStorage.getItem('blink_token');
    fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setMentionUsers(d); }).catch(() => {});
  }, []);

  // Read receipts for DMs
  useEffect(() => {
    if (channel.type !== 'DM') return;
    const token = localStorage.getItem('blink_token');
    const updateReceipt = () => fetch(`${API}/api/read-receipt/${channel.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    const fetchReceipts = () => fetch(`${API}/api/read-receipt/${channel.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setReadReceipts(d); }).catch(() => {});
    updateReceipt();
    fetchReceipts();
    const interval = setInterval(() => { updateReceipt(); fetchReceipts(); }, 5000);
    return () => clearInterval(interval);
  }, [channel.id]);

  const filteredMentions = mentionQuery !== null
    ? mentionUsers.filter(u => (u.full_name || '').toLowerCase().includes(mentionQuery)).slice(0, 6)
    : [];

  const insertMention = (u) => {
    const firstName = u.full_name.split(' ')[0];
    const pos = inputRef.current?.selectionStart || inputText.length;
    const before = inputText.slice(0, pos).replace(/@\w*$/, `@${firstName} `);
    setInputText(before + inputText.slice(pos));
    setMentionQuery(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const jumpToMessage = useCallback((messageId) => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setJumpingTo(messageId);
      setTimeout(() => setJumpingTo(null), 2000);
    }
  }, []);

  const fetchLinkPreview = useCallback((url) => {
    setLinkPreviews(prev => {
      if (url in prev) return prev;
      const token = localStorage.getItem('blink_token');
      fetch(`${API}/api/link-preview?url=${encodeURIComponent(url)}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => {
          if (!d.error) setLinkPreviews(p => ({ ...p, [url]: d }));
          else setLinkPreviews(p => ({ ...p, [url]: null }));
        }).catch(() => setLinkPreviews(p => ({ ...p, [url]: null })));
      return { ...prev, [url]: null };
    });
  }, []);

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    const token = localStorage.getItem('blink_token');
    try {
      const res = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}&channelId=${channel.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setSearchResults(Array.isArray(d) ? d : []);
    } catch {}
    setSearchLoading(false);
  }, [channel.id]);

  // Compute "seen" target: last own message the other user has read (DM only)
  const seenMessageId = useMemo(() => {
    if (channel.type !== 'DM') return null;
    const other = readReceipts.find(r => r.user_id !== user.id);
    if (!other) return null;
    const readAt = new Date(other.last_read_at);
    const ownMsgs = messages.filter(m => m.user_id === user.id && new Date(m.timestamp) <= readAt);
    return ownMsgs.length ? ownMsgs[ownMsgs.length - 1].id : null;
  }, [readReceipts, messages, user.id, channel.type]);

  // Load messages + pinned + connect WS on channel change
  useEffect(() => {
    if (!channel) return;
    setMessages([]);
    setReplyTo(null);
    setPinnedMessages([]);
    setShowPinned(false);

    const token = localStorage.getItem('blink_token');
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API}/api/messages/${channel.id}`, { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMessages(data); })
      .catch(() => {});

    const socket = new WebSocket(`${WS_URL}/api/ws?room=${channel.id}`);
    socket.onopen = () => socket.send(JSON.stringify({ type: 'join', channelId: channel.id, userId: user.id }));

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'new_message') {
          setTypingUsers(prev => { const n = { ...prev }; delete n[data.message.user_id]; return n; });
          setMessages(prev => [...prev, data.message]);
          if (data.message.user_id !== user.id) {
            if (!document.hidden) {
              let preview = (data.message.content || '').slice(0, 60);
              if (data.message.type === 'NEXUS') {
                try { const d = JSON.parse(data.message.content); preview = `Task assigned: ${d.taskTitle}`; } catch {}
              }
              onNewMessage?.(channel.id, { senderName: data.message.full_name, preview, channel });
            }
          }
        }

        if (data.type === 'typing') {
          setTypingUsers(prev => ({ ...prev, [data.userId]: data.userName }));
          clearTimeout(typingTimeouts.current[data.userId]);
          typingTimeouts.current[data.userId] = setTimeout(() => {
            setTypingUsers(prev => { const n = { ...prev }; delete n[data.userId]; return n; });
          }, 3000);
        }

        if (data.type === 'message_edited') {
          setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, content: data.content, edited_at: data.editedAt } : m));
        }

        if (data.type === 'message_deleted') {
          setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, is_deleted: 1 } : m));
        }

        if (data.type === 'reaction_updated') {
          setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
        }

        if (data.type === 'message_pinned' && data.messageObj) {
          const m = data.messageObj;
          setPinnedMessages(prev => {
            if (prev.some(p => p.message_id === m.id)) return prev;
            return [...prev, { id: crypto.randomUUID(), message_id: m.id, content: m.content, author_name: m.full_name, is_deleted: m.is_deleted }];
          });
        }

        if (data.type === 'message_unpinned') {
          setPinnedMessages(prev => prev.filter(p => p.message_id !== data.messageId));
        }

        if (data.type === 'poll_updated') {
          setMessages(prev => prev.map(m => {
            if (!m.poll || m.poll.id !== data.pollId) return m;
            const userVote = data.votes?.find(v => v.user_id === user.id)?.option_id || m.poll.userVote;
            return { ...m, poll: { ...m.poll, options: data.options, totalVotes: data.totalVotes, userVote } };
          }));
        }

        if (data.type === 'error') {
          setRateLimitError(data.message);
          setTimeout(() => setRateLimitError(null), 4000);
        }
      } catch {}
    };

    wsRef.current = socket;
    return () => { socket.close(); wsRef.current = null; };
  }, [channel]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const handler = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sendWS = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(data));
  }, []);

  const handleCreatePoll = useCallback(() => {
    const opts = pollOptions.map(o => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || opts.length < 2) return;
    sendWS({ type: 'create_poll', channelId: channel.id, userId: user.id, userName: user.full_name, avatarUrl: user.avatar_url, question: pollQuestion.trim(), options: opts });
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  }, [pollQuestion, pollOptions, channel, user, sendWS]);

  const handleVotePoll = useCallback((pollId, optionId) => {
    sendWS({ type: 'vote_poll', pollId, optionId, userId: user.id, channelId: channel.id });
    setMessages(prev => prev.map(m => {
      if (!m.poll || m.poll.id !== pollId) return m;
      const oldVote = m.poll.userVote;
      const options = m.poll.options.map(o => ({
        ...o,
        votes: o.id === optionId ? o.votes + 1 : (o.id === oldVote ? Math.max(0, o.votes - 1) : o.votes),
      }));
      return { ...m, poll: { ...m.poll, options, totalVotes: m.poll.totalVotes + (oldVote ? 0 : 1), userVote: optionId } };
    }));
  }, [sendWS, user, channel]);

  const fetchScheduled = useCallback(async () => {
    const token = localStorage.getItem('blink_token');
    try {
      const res = await fetch(`${API}/api/scheduled?channelId=${channel.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setScheduledMsgs(Array.isArray(d) ? d : []);
    } catch {}
  }, [channel.id]);

  const handleScheduleSend = useCallback(async () => {
    if (!inputText.trim() || !scheduleAt) return;
    const token = localStorage.getItem('blink_token');
    try {
      const res = await fetch(`${API}/api/scheduled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channelId: channel.id, content: inputText.trim(), sendAt: new Date(scheduleAt).toISOString(), replyToId: replyTo?.id || null }),
      });
      if (res.ok) {
        setInputText('');
        setReplyTo(null);
        setShowScheduler(false);
        setScheduleAt('');
        fetchScheduled();
      }
    } catch {}
  }, [inputText, scheduleAt, channel.id, replyTo, fetchScheduled]);

  const handleCancelScheduled = useCallback(async (id) => {
    const token = localStorage.getItem('blink_token');
    try {
      await fetch(`${API}/api/scheduled/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setScheduledMsgs(prev => prev.filter(m => m.id !== id));
    } catch {}
  }, []);

  useEffect(() => { fetchScheduled(); }, [fetchScheduled]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    sendWS({
      type: 'message',
      channelId: channel.id,
      userId: user.id,
      userName: user.full_name,
      avatarUrl: user.avatar_url,
      content: inputText.trim(),
      replyToId: replyTo?.id || null,
      replyContent: replyTo?.content || null,
      replyUserName: replyTo?.full_name || null,
    });
    setInputText('');
    setReplyTo(null);
  }, [inputText, channel, user, replyTo, sendWS]);

  const handleToggleReaction = useCallback((messageId, emoji) => {
    sendWS({ type: 'toggle_reaction', messageId, emoji, userId: user.id, channelId: channel.id });
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = m.reactions || [];
      const has = reactions.some(r => r.emoji === emoji && r.user_id === user.id);
      return {
        ...m, reactions: has
          ? reactions.filter(r => !(r.emoji === emoji && r.user_id === user.id))
          : [...reactions, { emoji, user_id: user.id }],
      };
    }));
  }, [sendWS, user, channel]);

  const handleEdit = useCallback((messageId, content) => {
    sendWS({ type: 'edit_message', messageId, content, userId: user.id, channelId: channel.id });
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m));
  }, [sendWS, user, channel]);

  const handleDelete = useCallback((messageId) => {
    const msg = messages.find(m => m.id === messageId);
    sendWS({ type: 'delete_message', messageId, userId: user.id, userRole: user.role, channelId: channel.id, isOwn: msg?.user_id === user.id });
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: 1 } : m));
  }, [sendWS, user, channel, messages]);

  const handlePin = useCallback((messageId) => {
    const messageObj = messages.find(m => m.id === messageId);
    sendWS({ type: 'pin_message', messageId, userId: user.id, channelId: channel.id, messageObj });
  }, [sendWS, user, channel, messages]);

  const handleUnpin = useCallback((messageId) => {
    sendWS({ type: 'unpin_message', messageId, channelId: channel.id });
    setPinnedMessages(prev => prev.filter(p => p.message_id !== messageId));
  }, [sendWS, channel]);

  const handleFileSend = ({ file, caption }) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(), user_id: user.id, full_name: user.full_name,
      content: caption || '', file: { name: file.name, size: `${(file.size / 1024).toFixed(1)} KB` },
      timestamp: new Date().toISOString(), reactions: [], is_deleted: 0,
    }]);
  };

  const pinnedIds = useMemo(() => new Set(pinnedMessages.map(p => p.message_id)), [pinnedMessages]);
  const channelTitle = channel.type === 'DM' ? channel.other_user_name : channel.name;

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {channel.type === 'DM' ? <MessageCircle size={20} className="text-muted" /> : <Hash size={20} className="text-muted" />}
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{channelTitle}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {pinnedMessages.length > 0 && (
              <button onClick={() => setShowPinned(p => !p)} className="text-muted" title="Pinned messages" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: showPinned ? 'var(--primary)' : undefined }}>
                <Pin size={16} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{pinnedMessages.length}</span>
              </button>
            )}
            {channel.type !== 'DM' && (
              <button onClick={copyChannelInvite} className="text-muted" title="Copy invite link for this channel"
                style={{ display: 'flex', color: inviteCopied ? '#10b981' : undefined }}>
                {inviteCopied ? <Check size={18} /> : <Link2 size={18} />}
              </button>
            )}
            {scheduledMsgs.length > 0 && (
              <button onClick={() => setShowScheduled(p => !p)} className="text-muted" title="Scheduled messages"
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: showScheduled ? 'var(--primary)' : 'var(--primary)' }}>
                <Clock size={16} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{scheduledMsgs.length}</span>
              </button>
            )}
            <button onClick={() => { setShowSearch(p => !p); setSearchQuery(''); setSearchResults([]); }} className="text-muted" style={{ color: showSearch ? 'var(--primary)' : undefined }}>
              <Search size={18} />
            </button>
            <button onClick={() => { setShowProfile(p => !p); setShowFiles(false); }} className="text-muted" style={{ display: 'flex', color: showProfile ? 'var(--primary)' : undefined }}>
              <Users size={18} />
            </button>
            <button onClick={() => { setShowFiles(f => !f); setShowProfile(false); }} className="text-muted" style={{ display: 'flex', color: showFiles ? 'var(--primary)' : undefined }}>
              <FolderOpen size={18} />
            </button>
          </div>
        </header>

        {/* Pinned messages panel */}
        {showPinned && pinnedMessages.length > 0 && (
          <div style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Pin size={13} style={{ color: 'var(--primary)' }} /> {pinnedMessages.length} Pinned Message{pinnedMessages.length > 1 ? 's' : ''}
              </span>
              <button onClick={() => setShowPinned(false)} className="text-muted"><X size={14} /></button>
            </div>
            {pinnedMessages.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', padding: '0.4rem 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>{p.author_name}</span>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {p.is_deleted ? 'This message was deleted.' : p.content}
                  </p>
                </div>
                {isAdmin && (
                  <button onClick={() => handleUnpin(p.message_id)} className="text-muted" title="Unpin" style={{ flexShrink: 0 }}>
                    <PinOff size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Scheduled messages panel */}
        {showScheduled && scheduledMsgs.length > 0 && (
          <div style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={13} style={{ color: 'var(--primary)' }} /> {scheduledMsgs.length} Scheduled Message{scheduledMsgs.length > 1 ? 's' : ''}
              </span>
              <button onClick={() => setShowScheduled(false)} className="text-muted"><X size={14} /></button>
            </div>
            {scheduledMsgs.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', padding: '0.4rem 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {new Date(m.send_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{m.content}</p>
                </div>
                <button onClick={() => handleCancelScheduled(m.id)} className="text-muted" title="Cancel" style={{ flexShrink: 0 }}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Search panel */}
        {showSearch && (
          <div style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', padding: '0.75rem 1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text" placeholder="Search messages…" autoFocus
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); runSearch(e.target.value); }}
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'var(--bg-chat)', color: 'var(--text-main)' }}
              />
              <button onClick={() => setShowSearch(false)} className="text-muted"><X size={16} /></button>
            </div>
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {searchLoading && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>Searching…</p>}
              {!searchLoading && searchQuery && searchResults.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>No results found.</p>
              )}
              {searchResults.map(r => (
                <button key={r.id} onClick={() => { jumpToMessage(r.id); setShowSearch(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '8px', background: 'none', display: 'block' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-chat)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '2px' }}>{r.full_name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatTime(r.timestamp)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="chat-area" ref={scrollRef}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.9rem' }}>
              {channel.type === 'DM'
                ? `Start a conversation with ${channel.other_user_name}`
                : `No messages yet. Be the first to say something in #${channel.name}!`}
            </div>
          )}
          {messages.map(msg => (
            <MessageItem
              key={msg.id}
              msg={msg}
              currentUser={user}
              isAdmin={isAdmin}
              onReply={setReplyTo}
              onToggleReaction={handleToggleReaction}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPin={handlePin}
              onUnpin={handleUnpin}
              isPinned={pinnedIds.has(msg.id)}
              onAvatarClick={(u) => { setProfileUser(u); setShowProfile(true); }}
              onJump={jumpToMessage}
              isJumping={jumpingTo === msg.id}
              linkPreviews={linkPreviews}
              onFetchPreview={fetchLinkPreview}
              isSeenTarget={seenMessageId === msg.id}
              onVotePoll={handleVotePoll}
            />
          ))}
        </div>

        {/* Typing indicator */}
        {Object.keys(typingUsers).length > 0 && (
          <div style={{ padding: '0 1.5rem 0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing</span>
            <span style={{ display: 'inline-flex', gap: '3px' }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--text-muted)', display: 'inline-block', animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </span>
          </div>
        )}

        {/* Input */}
        <div className="input-area" style={{ position: 'relative' }}>
          {filteredMentions.length > 0 && (
            <div style={{ position: 'absolute', bottom: '100%', left: '1.5rem', right: '1.5rem', backgroundColor: 'var(--bg-chat)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow-md)', zIndex: 200, overflow: 'hidden', marginBottom: '4px' }}>
              {filteredMentions.map((u, i) => (
                <button key={u.id} onClick={() => insertMention(u)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', background: i === mentionIndex ? 'var(--primary-light)' : 'none', textAlign: 'left' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
                    {(u.full_name || '?')[0]}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>{u.full_name}</span>
                </button>
              ))}
            </div>
          )}
          {rateLimitError && (
            <div style={{ padding: '0.375rem 0.75rem', marginBottom: '0.4rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '0.8125rem', color: '#dc2626' }}>
              {rateLimitError}
            </div>
          )}
          {replyTo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid var(--border)' }}>
              <Reply size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Replying to <strong style={{ color: 'var(--text-main)' }}>{replyTo.full_name}</strong>: {replyTo.content}
              </span>
              <button onClick={() => setReplyTo(null)} className="text-muted"><X size={13} /></button>
            </div>
          )}

          <div className="input-container" style={{ border: '1px solid var(--border)', padding: '0.5rem 0.75rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="text-muted" onClick={() => setIsModalOpen(true)}><Paperclip size={20} /></button>
              <button className="text-muted"><ImageIcon size={20} /></button>
              <button className="text-muted"><AtSign size={20} /></button>
              <button className="text-muted" onClick={() => setShowPollCreator(true)} title="Create poll"><BarChart2 size={20} /></button>
              <button className="text-muted" onClick={() => setShowScheduler(true)} title="Schedule message" style={{ color: scheduledMsgs.length > 0 ? 'var(--primary)' : undefined }}><Clock size={20} /></button>
              <div style={{ position: 'relative' }} ref={emojiPickerRef}>
                <button className="text-muted" onClick={() => setShowEmojiPicker(p => !p)}><Smile size={20} /></button>
                {showEmojiPicker && (
                  <div style={{ position: 'absolute', bottom: '2.5rem', left: 0, zIndex: 100 }}>
                    <Picker data={data} onEmojiSelect={e => { setInputText(p => p + e.native); setShowEmojiPicker(false); }} theme="light" previewPosition="none" skinTonePosition="none" />
                  </div>
                )}
              </div>
            </div>
            <textarea
              ref={inputRef}
              className="message-input"
              rows={1}
              placeholder={channel.type === 'DM' ? `Message ${channel.other_user_name}…` : `Message #${channel.name}…`}
              value={inputText}
              onChange={e => {
                const val = e.target.value;
                setInputText(val);
                const pos = e.target.selectionStart;
                const before = val.slice(0, pos);
                const match = before.match(/@(\w*)$/);
                setMentionQuery(match ? match[1].toLowerCase() : null);
                setMentionIndex(0);
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: 'typing', channelId: channel.id, userId: user.id, userName: user.full_name }));
                }
              }}
              onKeyDown={e => {
                if (filteredMentions.length > 0) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % filteredMentions.length); return; }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => (i - 1 + filteredMentions.length) % filteredMentions.length); return; }
                  if (e.key === 'Enter') { e.preventDefault(); insertMention(filteredMentions[mentionIndex]); return; }
                  if (e.key === 'Escape') { setMentionQuery(null); return; }
                }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              style={{ color: 'var(--text-main)' }}
            />
            <button className="send-btn" onClick={handleSend} disabled={!inputText.trim()}><Send size={18} /></button>
          </div>
        </div>
      </div>

      {showScheduler && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-in" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-chat)', borderRadius: '20px', padding: '1.75rem', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={18} style={{ color: 'var(--primary)' }} /> Schedule Message</h3>
              <button onClick={() => setShowScheduler(false)} className="text-muted"><X size={18} /></button>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '10px', fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '1.25rem', border: '1px solid var(--border)', minHeight: 48 }}>
              {inputText.trim() || <span style={{ color: 'var(--text-muted)' }}>No message typed yet…</span>}
            </div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>SEND AT</label>
            <input
              type="datetime-local"
              value={scheduleAt}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              onChange={e => setScheduleAt(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.625rem 0.875rem', fontSize: '0.9375rem', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', marginBottom: '1.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowScheduler(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.9375rem', color: 'var(--text-muted)', backgroundColor: 'transparent' }}>Cancel</button>
              <button onClick={handleScheduleSend} disabled={!inputText.trim() || !scheduleAt}
                style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', backgroundColor: 'var(--primary)', color: 'white', fontSize: '0.9375rem', fontWeight: 600, opacity: (!inputText.trim() || !scheduleAt) ? 0.5 : 1 }}>
                Schedule
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showProfile && <ProfileSidebar user={profileUser} onClose={() => setShowProfile(false)} />}
      {showFiles && !showProfile && <FileSidebar messages={messages} onClose={() => setShowFiles(false)} />}
      <FileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSend={handleFileSend} />

      {showPollCreator && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-in" style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--bg-chat)', borderRadius: '20px', padding: '1.75rem', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart2 size={18} style={{ color: 'var(--primary)' }} /> Create Poll</h3>
              <button onClick={() => setShowPollCreator(false)} className="text-muted"><X size={18} /></button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>QUESTION</label>
              <input type="text" autoFocus value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                placeholder="Ask a question…"
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.625rem 0.875rem', fontSize: '0.9375rem', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>OPTIONS</label>
              {pollOptions.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="text" value={opt} onChange={e => setPollOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                    placeholder={`Option ${i + 1}`}
                    style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))} className="text-muted" style={{ padding: '0.5rem' }}><Minus size={14} /></button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button onClick={() => setPollOptions(prev => [...prev, ''])}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, background: 'none', padding: '0.25rem 0' }}>
                  <Plus size={14} /> Add option
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPollCreator(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.9375rem', color: 'var(--text-muted)', backgroundColor: 'transparent' }}>Cancel</button>
              <button onClick={handleCreatePoll}
                disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', backgroundColor: 'var(--primary)', color: 'white', fontSize: '0.9375rem', fontWeight: 600, opacity: (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) ? 0.5 : 1 }}>
                Create Poll
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ChatArea;
