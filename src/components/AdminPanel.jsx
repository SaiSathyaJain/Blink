import React from 'react';
import { 
  Users, 
  Zap, 
  Send, 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Edit2, 
  MinusCircle,
  MoreVertical,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const AdminPanel = () => {
  const stats = [
    { label: 'Total Users', value: '1,284', change: '+12%', icon: Users, color: '#f5f3ff', iconColor: '#7c3aed' },
    { label: 'Active Today', value: '842', change: '+4%', icon: Zap, color: '#eff6ff', iconColor: '#2563eb' },
    { label: 'Messages Sent', value: '42,910', change: '-2%', icon: Send, color: '#fff7ed', iconColor: '#ea580c' },
    { label: 'Files Uploaded', value: '15.4 GB', change: '+18%', icon: Upload, color: '#f8fafc', iconColor: '#64748b' },
  ];

  const users = [
    { name: 'Felix Vane', email: 'felix@officetalk.com', role: 'OWNER', status: 'Online', lastActive: 'Just now', avatar: '#' },
    { name: 'Sarah Connor', email: 's.connor@cyber.tech', role: 'EDITOR', status: 'Away', lastActive: '14 mins ago', avatar: '#' },
    { name: 'Leo Sterling', email: 'sterling@design.co', role: 'MEMBER', status: 'Offline', lastActive: '2 days ago', avatar: '#' },
    { name: 'Morgan Freeman', email: 'voice@holy.wood', role: 'MEMBER', status: 'Online', lastActive: '5 mins ago', avatar: '#' },
  ];

  const activities = [
    { user: 'Sarah Connor', action: 'updated role to Editor', time: '10:42 AM', color: '#4f46e5' },
    { user: 'System Audit', action: 'Multiple failed login attempts from IP 192.168.1.1', time: '09:15 AM', color: '#ef4444' },
    { user: 'AWS Infrastructure', action: 'Server successfully scaled to handle increased message volume', time: '08:30 AM', color: '#10b981' },
  ];

  return (
    <div style={{ padding: '2rem', height: '100%', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Admin Panel</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Manage users and workspace infrastructure</p>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Global search..." 
            style={{ 
                padding: '0.625rem 1rem 0.625rem 2.75rem', 
                borderRadius: '10px', 
                border: '1px solid var(--border)', 
                width: '300px',
                fontSize: '0.875rem'
            }}
          />
        </div>
      </header>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: stat.color, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.iconColor }}>
                <stat.icon size={20} />
              </div>
              <div style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: stat.change.startsWith('+') ? '#10b981' : '#ef4444',
                  backgroundColor: stat.change.startsWith('+') ? '#ecfdf5' : '#fef2f2',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
              }}>
                {stat.change.startsWith('+') ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {stat.change}
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stat.value}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* User Directory */}
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700 }}>User Directory</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="text-muted" style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '8px' }}><Filter size={16} /></button>
                <button className="text-muted" style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '8px' }}><Download size={16} /></button>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>User</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Active</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="avatar" style={{ width: '32px', height: '32px', borderRadius: '8px' }}></div>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                        fontSize: '0.6875rem', 
                        fontWeight: 700, 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        backgroundColor: '#eef2ff', 
                        color: '#4f46e5',
                        border: '1px solid #e0e7ff'
                    }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: u.status === 'Online' ? '#10b981' : (u.status === 'Away' ? '#f59e0b' : '#94a3b8') }}></div>
                      {u.status}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{u.lastActive}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-muted)' }}>
                      <Edit2 size={16} />
                      <MinusCircle size={16} style={{ color: '#ef4444' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <span>Showing 1-10 of 1,284 users</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={{ width: '32px', height: '32px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '6px' }}>1</button>
                  {[2, 3].map(p => <button key={p} style={{ width: '32px', height: '32px', border: '1px solid var(--border)', borderRadius: '6px' }}>{p}</button>)}
              </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontWeight: 700 }}>Recent Activity</h3>
                    <button style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>VIEW ALL</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {activities.map((a, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.75rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: a.color, marginTop: '6px', flexShrink: 0 }}></div>
                            <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{a.user} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{a.action}</span></div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{a.time}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '16px', padding: '1.5rem', backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Workspace Health</h3>
                <p style={{ fontSize: '0.8125rem', opacity: 0.8, marginBottom: '1.5rem' }}>Everything looks great! All systems are performing within normal parameters.</p>
                
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        <span>STORAGE</span>
                        <span>64%</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '3px', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '64%', backgroundColor: 'white', borderRadius: '3px' }}></div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
