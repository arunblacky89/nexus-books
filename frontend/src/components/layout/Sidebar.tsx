import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, ShoppingCart, Users, Package,
  CreditCard, Receipt, BookOpen, BarChart3, Settings,
  ChevronDown, Building2, DollarSign, TrendingUp
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

interface NavItem {
  label: string
  icon: React.ReactNode
  path?: string
  children?: { label: string; path: string }[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/dashboard' },
  {
    label: 'Sales', icon: <TrendingUp size={18} />,
    children: [
      { label: 'Invoices', path: '/invoices' },
      { label: 'Customers', path: '/contacts?type=customer' },
      { label: 'Payments Received', path: '/payments?type=received' },
    ]
  },
  {
    label: 'Purchases', icon: <ShoppingCart size={18} />,
    children: [
      { label: 'Bills', path: '/bills' },
      { label: 'Vendors', path: '/contacts?type=vendor' },
      { label: 'Payments Made', path: '/payments?type=made' },
      { label: 'Expenses', path: '/expenses' },
    ]
  },
  { label: 'Items', icon: <Package size={18} />, path: '/items' },
  { label: 'Contacts', icon: <Users size={18} />, path: '/contacts' },
  { label: 'Payments', icon: <CreditCard size={18} />, path: '/payments' },
  {
    label: 'Accountant', icon: <BookOpen size={18} />,
    children: [
      { label: 'Chart of Accounts', path: '/chart-of-accounts' },
      { label: 'Journal Entries', path: '/journal-entries' },
    ]
  },
  {
    label: 'Reports', icon: <BarChart3 size={18} />,
    children: [
      { label: 'Profit & Loss', path: '/reports?type=profit_loss' },
      { label: 'Balance Sheet', path: '/reports?type=balance_sheet' },
      { label: 'Receivables', path: '/reports?type=receivables' },
      { label: 'GST Report', path: '/reports?type=gst' },
    ]
  },
  { label: 'Settings', icon: <Settings size={18} />, path: '/settings' },
]

export default function Sidebar() {
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const [openGroups, setOpenGroups] = useState<string[]>(['Sales', 'Purchases'])

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    )
  }

  const isChildActive = (children: { path: string }[]) =>
    children.some(c => location.pathname.startsWith(c.path.split('?')[0]))

  return (
    <aside style={{
      width: 220,
      background: 'var(--sidebar-bg)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: '0 16px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        gap: 10,
      }}>
        <div style={{
          width: 32,
          height: 32,
          background: 'var(--primary)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <DollarSign size={18} color="white" />
        </div>
        <div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>NexusBooks</div>
          <div style={{ color: 'var(--sidebar-text)', fontSize: 10, marginTop: 1 }}>Accounting</div>
        </div>
      </div>

      {/* Organization */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
      }}>
        <div style={{
          width: 28,
          height: 28,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Building2 size={14} color="var(--sidebar-text)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.organization_name || 'Organization'}
          </div>
          <div style={{ color: 'var(--sidebar-text)', fontSize: 10 }}>Free Trial</div>
        </div>
        <ChevronDown size={12} color="var(--sidebar-text)" />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {navItems.map(item => {
          if (item.path) {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  color: isActive ? 'white' : 'var(--sidebar-text)',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  background: isActive ? 'rgba(0,102,204,0.25)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ color: isActive ? '#60A5FA' : 'var(--sidebar-text)', flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </NavLink>
            )
          }

          const isOpen = openGroups.includes(item.label)
          const hasActive = item.children && isChildActive(item.children)

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleGroup(item.label)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: hasActive ? 'white' : 'var(--sidebar-text)',
                  fontSize: 13,
                  fontWeight: hasActive ? 500 : 400,
                  borderLeft: '3px solid transparent',
                  textAlign: 'left',
                }}
              >
                <span style={{ color: hasActive ? '#60A5FA' : 'var(--sidebar-text)', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <ChevronDown
                  size={12}
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
                />
              </button>
              {isOpen && item.children && (
                <div style={{ background: 'rgba(0,0,0,0.15)' }}>
                  {item.children.map(child => {
                    const childPath = child.path.split('?')[0]
                    const isChildActv = location.pathname === childPath
                    return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '7px 16px 7px 44px',
                          color: isChildActv ? '#60A5FA' : '#7B8FA8',
                          textDecoration: 'none',
                          fontSize: 13,
                          fontWeight: isChildActv ? 500 : 400,
                          borderLeft: isChildActv ? '3px solid var(--primary)' : '3px solid transparent',
                        }}
                      >
                        {child.label}
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 12,
          fontWeight: 600,
          flexShrink: 0,
        }}>
          {user?.first_name?.[0] || user?.username?.[0] || 'A'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
          </div>
          <div style={{ color: 'var(--sidebar-text)', fontSize: 10, textTransform: 'capitalize' }}>{user?.role}</div>
        </div>
      </div>
    </aside>
  )
}
