import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import api from '../services/api'

const fmt = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#F1F5F9', marginBottom: '12px' }} />
      <div style={{ width: '60%', height: '12px', background: '#F1F5F9', borderRadius: '4px', marginBottom: '8px' }} />
      <div style={{ width: '80%', height: '22px', background: '#E2E8F0', borderRadius: '4px' }} />
    </div>
  )
}

const KPI_CONFIGS = [
  { key: 'total_receivables', label: 'Total Receivables', color: '#0066CC', bg: '#EFF6FF', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066CC" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
  )},
  { key: 'total_payables', label: 'Total Payables', color: '#EA580C', bg: '#FFF7ED', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2"><path d="M9 14l6-6M15 14H9v-6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
  )},
  { key: 'revenue_this_month', label: 'Revenue This Month', color: '#16A34A', bg: '#F0FDF4', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  )},
  { key: 'expenses_this_month', label: 'Expenses This Month', color: '#DC2626', bg: '#FEF2F2', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
  )},
  { key: 'net_profit', label: 'Net Profit', color: '#7C3AED', bg: '#F5F3FF', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
  )},
  { key: 'overdue_count', label: 'Overdue Invoices', color: '#D97706', bg: '#FFFBEB', isCount: true, icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  )},
]

const PIE_COLORS: Record<string, string> = {
  draft: '#94A3B8', sent: '#3B82F6', paid: '#16A34A', overdue: '#DC2626', partial: '#D97706',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/').then(r => r.data),
  })

  const kpis = data?.kpis || {}
  const chartData = data?.monthly_data || []
  const pieData = data?.invoice_status_distribution || []
  const recentInvoices = data?.recent_invoices || []
  const topCustomers = data?.top_customers || []

  return (
    <div className="fade-in" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>Dashboard</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select className="nb-select" style={{ width: 'auto', fontSize: '13px' }}>
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Quarter</option>
            <option>This Year</option>
          </select>
          <button className="btn-primary btn-sm" onClick={() => navigate('/invoices/new')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Invoice
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {isLoading
          ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : KPI_CONFIGS.map(cfg => {
              const val = kpis[cfg.key] ?? 0
              const change = kpis[`${cfg.key}_change`] ?? 0
              return (
                <div key={cfg.key} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {cfg.icon}
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '99px',
                      background: change >= 0 ? '#F0FDF4' : '#FEF2F2',
                      color: change >= 0 ? '#16A34A' : '#DC2626',
                    }}>
                      {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{cfg.label}</p>
                  <p style={{ fontSize: '22px', fontWeight: '700', color: cfg.color }}>
                    {cfg.isCount ? val : fmt(val)}
                  </p>
                </div>
              )
            })
        }
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px', marginBottom: '24px' }}>
        {/* Area Chart */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>Revenue vs Expenses (Last 6 Months)</h3>
          {isLoading ? (
            <div style={{ height: '240px', background: '#F8FAFC', borderRadius: '8px' }} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0066CC" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0066CC" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: number, name: string) => [fmt(val), name === 'revenue' ? 'Revenue' : 'Expenses']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#0066CC" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="expenses" stroke="#DC2626" strokeWidth={2} fill="url(#expGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>Invoice Status</h3>
          {isLoading ? (
            <div style={{ height: '240px', background: '#F8FAFC', borderRadius: '8px' }} />
          ) : pieData.length === 0 ? (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No data available</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[entry.name?.toLowerCase()] || '#CBD5E1'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v, n]} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {pieData.map((d: any) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: PIE_COLORS[d.name?.toLowerCase()] || '#CBD5E1', display: 'inline-block' }} />
                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
        {/* Recent Invoices */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Recent Invoices</h3>
            <button className="btn-secondary btn-sm" onClick={() => navigate('/invoices')}>View All</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array(5).fill(0).map((_, i) => (
                      <tr key={i}>
                        {Array(5).fill(0).map((_, j) => (
                          <td key={j}><div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: j === 1 ? '70%' : '50%' }} /></td>
                        ))}
                      </tr>
                    ))
                  : recentInvoices.length === 0
                  ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No invoices yet</td></tr>
                  )
                  : recentInvoices.map((inv: any) => (
                    <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td style={{ color: 'var(--primary)', fontWeight: '500' }}>{inv.invoice_number}</td>
                      <td>{inv.customer_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: '500' }}>{fmt(inv.total)}</td>
                      <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Customers */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Top Customers</h3>
          </div>
          <div style={{ padding: '8px 0' }}>
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px' }}>
                    <div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: '50%' }} />
                    <div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: '25%' }} />
                  </div>
                ))
              : topCustomers.length === 0
              ? <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>No data yet</p>
              : topCustomers.map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '24px', height: '24px', borderRadius: '50%', background: '#EFF6FF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: '700', color: 'var(--primary)',
                      }}>{i + 1}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{fmt(c.total)}</span>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
