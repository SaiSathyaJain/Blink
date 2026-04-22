import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Trash2, ChevronRight, MessageSquare, Calendar, User, Flag, Layers } from 'lucide-react';

const API = 'https://blinkv2.saisathyajain.workers.dev';

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
const STATUS_COLORS = { TODO: '#6366f1', IN_PROGRESS: '#f59e0b', DONE: '#10b981' };
const PRIORITY_COLORS = { LOW: '#94a3b8', MEDIUM: '#f59e0b', HIGH: '#ef4444' };

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('blink_token')}`, 'Content-Type': 'application/json' };
}

function Badge({ label, color }) {
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: color + '22', color, letterSpacing: '0.03em' }}>
      {label}
    </span>
  );
}

function TaskCard({ task, onClick, onDelete, isAdmin }) {
  return (
    <div onClick={onClick} style={{ backgroundColor: 'var(--bg-chat)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.875rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'box-shadow 0.15s', boxShadow: 'var(--shadow-sm)' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.4 }}>{task.title}</span>
        {isAdmin && (
          <button onClick={e => { e.stopPropagation(); onDelete(task.id); }} className="text-muted" style={{ flexShrink: 0, padding: '2px' }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
      {task.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{task.description}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem' }}>
        <Badge label={task.priority} color={PRIORITY_COLORS[task.priority]} />
        {task.assignee_name && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <User size={10} /> {task.assignee_name}
          </span>
        )}
        {task.due_date && (
          <span style={{ fontSize: '0.6875rem', color: new Date(task.due_date) < new Date() && task.status !== 'DONE' ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Calendar size={10} /> {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskModal({ task, user, users, onClose, onUpdate }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [localTask, setLocalTask] = useState(task);

  useEffect(() => {
    fetch(`${API}/api/nexus/tasks/${task.id}/comments`, { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setComments(d); }).catch(() => {});
  }, [task.id]);

  const updateField = async (field, value) => {
    const updated = { ...localTask, [field]: value };
    setLocalTask(updated);
    await fetch(`${API}/api/nexus/tasks/${task.id}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ title: updated.title, description: updated.description, status: updated.status, priority: updated.priority, assignedTo: updated.assigned_to, dueDate: updated.due_date }),
    });
    onUpdate(updated);
  };

  const postComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    const res = await fetch(`${API}/api/nexus/tasks/${task.id}/comments`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ content: commentText.trim() }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments(prev => [...prev, c]);
      setCommentText('');
    }
    setPosting(false);
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '620px', maxHeight: '85vh', backgroundColor: 'var(--bg-chat)', borderRadius: '20px', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <input value={localTask.title} onChange={e => setLocalTask(p => ({ ...p, title: e.target.value }))} onBlur={() => updateField('title', localTask.title)}
            style={{ fontSize: '1.0625rem', fontWeight: 700, border: 'none', background: 'transparent', color: 'var(--text-main)', flex: 1, outline: 'none' }} />
          <button onClick={onClose} className="text-muted"><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Main */}
          <div style={{ flex: 1, padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea value={localTask.description || ''} onChange={e => setLocalTask(p => ({ ...p, description: e.target.value }))}
              onBlur={() => updateField('description', localTask.description)}
              placeholder="Add a description…"
              style={{ fontSize: '0.875rem', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.625rem', background: 'var(--bg-main)', resize: 'vertical', minHeight: '80px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />

            {/* Comments */}
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <MessageSquare size={13} /> Comments ({comments.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '0.75rem' }}>
                {comments.map(c => (
                  <div key={c.id} style={{ backgroundColor: 'var(--bg-main)', borderRadius: '10px', padding: '0.625rem 0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}>{c.full_name}</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-main)', margin: 0 }}>{c.content}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                  placeholder="Write a comment…" rows={2}
                  style={{ flex: 1, fontSize: '0.8125rem', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.75rem', background: 'var(--bg-main)', color: 'var(--text-main)', resize: 'none', outline: 'none' }} />
                <button onClick={postComment} disabled={posting || !commentText.trim()}
                  style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '8px', fontWeight: 600, fontSize: '0.8125rem', alignSelf: 'flex-end' }}>
                  Post
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width: '180px', borderLeft: '1px solid var(--border)', padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            {[
              { label: 'Status', field: 'status', options: STATUSES, labels: STATUS_LABELS, colors: STATUS_COLORS },
              { label: 'Priority', field: 'priority', options: ['LOW', 'MEDIUM', 'HIGH'], labels: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' }, colors: PRIORITY_COLORS },
            ].map(({ label, field, options, labels, colors }) => (
              <div key={field}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{label}</p>
                <select value={localTask[field]} onChange={e => { updateField(field, e.target.value); }}
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '0.375rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: colors[localTask[field]], fontWeight: 600, outline: 'none' }}>
                  {options.map(o => <option key={o} value={o} style={{ color: colors[o] }}>{labels[o]}</option>)}
                </select>
              </div>
            ))}

            <div>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Assignee</p>
              <select value={localTask.assigned_to || ''} onChange={e => updateField('assigned_to', e.target.value || null)}
                style={{ width: '100%', fontSize: '0.8125rem', padding: '0.375rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }}>
                <option value=''>Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>

            <div>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Due Date</p>
              <input type='date' value={localTask.due_date || ''} onChange={e => updateField('due_date', e.target.value || null)}
                style={{ width: '100%', fontSize: '0.8125rem', padding: '0.375rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Nexus({ user }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [saving, setSaving] = useState(false);
  const isAdmin = user.role === 'OWNER' || user.role === 'ADMIN';

  useEffect(() => {
    fetch(`${API}/api/nexus/projects`, { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setProjects(d); }).catch(() => {});
    fetch(`${API}/api/users`, { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d); }).catch(() => {});
  }, []);

  const loadTasks = useCallback((projectId) => {
    fetch(`${API}/api/nexus/projects/${projectId}/tasks`, { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setTasks(d); }).catch(() => {});
  }, []);

  const selectProject = (p) => { setSelectedProject(p); loadTasks(p.id); };

  const createProject = async () => {
    if (!projectName.trim()) return;
    setSaving(true);
    const res = await fetch(`${API}/api/nexus/projects`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name: projectName.trim(), description: projectDesc.trim() }) });
    if (res.ok) {
      const p = await res.json();
      setProjects(prev => [p, ...prev]);
      setProjectName(''); setProjectDesc(''); setShowNewProject(false);
    }
    setSaving(false);
  };

  const deleteProject = async (id) => {
    await fetch(`${API}/api/nexus/projects/${id}`, { method: 'DELETE', headers: authHeaders() });
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProject?.id === id) { setSelectedProject(null); setTasks([]); }
  };

  const createTask = async () => {
    if (!taskTitle.trim() || !selectedProject) return;
    setSaving(true);
    const res = await fetch(`${API}/api/nexus/tasks`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ projectId: selectedProject.id, title: taskTitle.trim(), description: taskDesc.trim(), priority: taskPriority, assignedTo: taskAssignee || null, dueDate: taskDue || null }) });
    if (res.ok) {
      const t = await res.json();
      setTasks(prev => [...prev, t]);
      setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, task_count: (p.task_count || 0) + 1 } : p));
      setTaskTitle(''); setTaskDesc(''); setTaskPriority('MEDIUM'); setTaskAssignee(''); setTaskDue(''); setShowNewTask(false);
    }
    setSaving(false);
  };

  const deleteTask = async (id) => {
    await fetch(`${API}/api/nexus/tasks/${id}`, { method: 'DELETE', headers: authHeaders() });
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTask = (updated) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    if (selectedTask?.id === updated.id) setSelectedTask(prev => ({ ...prev, ...updated }));
  };

  const tasksByStatus = STATUSES.reduce((acc, s) => ({ ...acc, [s]: tasks.filter(t => t.status === s) }), {});

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: 'var(--bg-main)' }}>
      {/* Projects sidebar */}
      <div style={{ width: '240px', borderRight: '1px solid var(--border)', backgroundColor: 'var(--bg-chat)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Nexus</span>
          </div>
          <button onClick={() => setShowNewProject(true)} title="New project"
            style={{ width: 28, height: 28, borderRadius: '8px', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={15} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {projects.length === 0 && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '0.5rem', textAlign: 'center' }}>No projects yet</p>}
          {projects.map(p => (
            <div key={p.id} onClick={() => selectProject(p)}
              style={{ padding: '0.625rem 0.75rem', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: selectedProject?.id === p.id ? 'var(--primary-light, #ede9fe)' : 'transparent', marginBottom: '2px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: selectedProject?.id === p.id ? 'var(--primary)' : 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>{p.task_count} task{p.task_count !== 1 ? 's' : ''}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {isAdmin && <button onClick={e => { e.stopPropagation(); deleteProject(p.id); }} className="text-muted"><Trash2 size={13} /></button>}
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Board */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedProject ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-muted)' }}>
            <Layers size={40} style={{ opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>Select a project to view tasks</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-chat)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1.125rem', margin: 0 }}>{selectedProject.name}</h2>
                {selectedProject.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>{selectedProject.description}</p>}
              </div>
              <button onClick={() => setShowNewTask(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem' }}>
                <Plus size={15} /> New Task
              </button>
            </div>

            {/* Kanban columns */}
            <div style={{ flex: 1, display: 'flex', gap: '1rem', padding: '1.25rem', overflowX: 'auto', overflowY: 'hidden' }}>
              {STATUSES.map(status => (
                <div key={status} style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: STATUS_COLORS[status], flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>{STATUS_LABELS[status]}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{tasksByStatus[status].length}</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '2px' }}>
                    {tasksByStatus[status].map(t => (
                      <TaskCard key={t.id} task={t} onClick={() => setSelectedTask(t)} onDelete={deleteTask} isAdmin={isAdmin || t.created_by === user.id} />
                    ))}
                    {tasksByStatus[status].length === 0 && (
                      <div style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No tasks</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProject && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--bg-chat)', borderRadius: '20px', padding: '1.75rem', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Layers size={18} style={{ color: 'var(--primary)' }} /> New Project</h3>
              <button onClick={() => setShowNewProject(false)} className="text-muted"><X size={18} /></button>
            </div>
            <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Project name" autoFocus
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9375rem', marginBottom: '0.75rem', boxSizing: 'border-box', outline: 'none' }} />
            <textarea value={projectDesc} onChange={e => setProjectDesc(e.target.value)} placeholder="Description (optional)" rows={3}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem', resize: 'none', boxSizing: 'border-box', outline: 'none', marginBottom: '1rem' }} />
            <button onClick={createProject} disabled={saving || !projectName.trim()}
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '12px', fontWeight: 700, fontSize: '0.9375rem' }}>
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </div>, document.body
      )}

      {/* New Task Modal */}
      {showNewTask && selectedProject && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: '100%', maxWidth: '460px', backgroundColor: 'var(--bg-chat)', borderRadius: '20px', padding: '1.75rem', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.0625rem' }}>New Task</h3>
              <button onClick={() => setShowNewTask(false)} className="text-muted"><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title" autoFocus
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9375rem', boxSizing: 'border-box', outline: 'none' }} />
              <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Description (optional)" rows={2}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem', resize: 'none', boxSizing: 'border-box', outline: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Priority</label>
                  <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: PRIORITY_COLORS[taskPriority], fontWeight: 600, fontSize: '0.875rem', outline: 'none' }}>
                    {['LOW', 'MEDIUM', 'HIGH'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Assignee</label>
                  <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none' }}>
                    <option value=''>Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Due Date</label>
                <input type='date' value={taskDue} onChange={e => setTaskDue(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={createTask} disabled={saving || !taskTitle.trim()}
                style={{ padding: '0.75rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '12px', fontWeight: 700, fontSize: '0.9375rem', marginTop: '0.25rem' }}>
                {saving ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {selectedTask && (
        <TaskModal task={selectedTask} user={user} users={users} onClose={() => setSelectedTask(null)} onUpdate={updateTask} />
      )}
    </div>
  );
}
