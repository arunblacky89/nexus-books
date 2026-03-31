import { Search, Bell, HelpCircle, Plus, LogOut, Settings, User } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Header() {
  const { user, logout } = useAuthStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <header style={{
      height: 56,
      background: 'white',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 12,
      flexShrink: 0,
      position: 'relative',
      zIndex: 100,
    }}>
      {/* Search */}
      <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search invoices, contacts, items..."
          style={{
            width: '100%',
            padding: '7px 12px 7px 32px',
            border: '1px solid var(--border)',
            borderRadius: 6,
            fontSize: 13,
            background: '#F8FAFC',
            outline: 'none',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* New Invoice Quick Action */}
      <button
        className="btn-orange btn-sm"
        onClick={() => navigate('/invoices/new')}
      >
        <Plus size={14} />
        New Invoice
      </button>

      {/* Icons */}
      <button className="btn-icon" title="Help">
        <HelpCircle size={16} />
      </button>
      <button className="btn-icon" title="Notifications" style={{ position: 'relative' }}>
        <Bell size={16} />
        <span style={{
          position: 'absolute', top: 6, right: 6,
          width: 7, height: 7,
          background: 'var(--danger)',
          borderRadius: '50%',
          border: '1.5px solid white',
        }} />
      </button>

      {/* User Avatar */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--primary)',
            border: 'none',
            cursor: 'pointer',
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {user?.first_name?.[0] || user?.username?.[0] || 'A'}
        </button>

        {showUserMenu && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 8,
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            width: 200,
            overflow: 'hidden',
            zIndex: 999,
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{user?.email}</div>
            </div>
            {[
              { icon: <User size={14} />, label: 'My Profile', action: () => {} },
              { icon: <Settings size={14} />, label: 'Settings', action: () => navigate('/settings') },
            ].map(item => (
              <button key={item.label} onClick={() => { item.action(); setShowUserMenu(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', textAlign: 'left' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={handleLogout}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--danger)', textAlign: 'left' }}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
