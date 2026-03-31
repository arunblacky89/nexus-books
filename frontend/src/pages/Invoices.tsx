import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const fmt = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`
const STATUS_TABS = ['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Void']

function SkeletonRow() {
  return (
    <tr>
      {Array(8).fill(0).map((_, i) => (
        <td key={i}><div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: i === 1 ? '70%' : '55%' }} /></td>
      ))}
    </tr>
  )
}

export default function Invoices() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const PAGE_SIZE = 15

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', activeTab, search, dateFrom, dateTo, page],
    queryFn: () => api.get('/invoices/', {
      params: {
        status: activeTab !== 'All' ? activeTab.toLowerCase() : undefined,
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page, page_size: PAGE_SIZE,
      }
    }).then(r => r.data),
  })

  const invoices = data?.results || []
  const total = data?.count || 0
  const counts = data?.status_counts || {}
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="fade-in" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Invoices</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{total} invoices total</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/invoices/new')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Invoice
        </button>
      </div>

      <div className="card">
        {/* Status Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', overflowX: 'auto' }}>
          {STATUS_TABS.map(tab => {
            const key = tab.toLowerCase()
            const count = tab === 'All' ? total : (counts[key] || 0)
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: activeTab === tab ? '600' : '400',
                  color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                  borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                  whiteSpace: 'nowrap', marginBottom: '-1px',
                }}
              >
                {tab}
                {count > 0 && (
                  <span style={{
                    fontSize: '11px', fontWeight: '600', padding: '1px 7px', borderRadius: '99px',
                    background: activeTab === tab ? 'var(--primary-light)' : '#F1F5F9',
                    color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                  }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="nb-input"
              placeholder="Search invoice# or customer..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="date" className="nb-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '150px' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>to</span>
            <input type="date" className="nb-input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '150px' }} />
          </div>
          {(search || dateFrom || dateTo) && (
            <button className="btn-secondary btn-sm" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1) }}>
              Clear Filters
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="nb-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ textAlign: 'right' }}>Balance Due (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(8).fill(0).map((_, i) => <SkeletonRow key={i} />)
                : invoices.length === 0
                ? (
                  <tr>
                    <td colSpan={8}>
                      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        </div>
                        <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>No invoices found</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                          {search ? `No results for "${search}"` : 'Create your first invoice to get started'}
                        </p>
                        <button className="btn-primary" onClick={() => navigate('/invoices/new')}>Create Invoice</button>
                      </div>
                    </td>
                  </tr>
                )
                : invoices.map((inv: any) => (
                  <tr key={inv.id}>
                    <td>
                      <button
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', padding: 0, fontSize: '13px' }}
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td style={{ fontWeight: '500' }}>{inv.customer_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                    <td style={{ color: inv.status === 'overdue' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {new Date(inv.due_date).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '500' }}>{fmt(inv.total)}</td>
                    <td style={{ textAlign: 'right', color: inv.balance_due > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: '500' }}>
                      {fmt(inv.balance_due)}
                    </td>
                    <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', position: 'relative' }}>
                        <button className="btn-icon btn-sm" title="View" onClick={() => navigate(`/invoices/${inv.id}`)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button className="btn-icon btn-sm" title="Edit" onClick={() => navigate(`/invoices/${inv.id}/edit`)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <div style={{ position: 'relative' }}>
                          <button className="btn-icon btn-sm" onClick={() => setOpenMenu(openMenu === inv.id ? null : inv.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                          {openMenu === inv.id && (
                            <div style={{
                              position: 'absolute', right: 0, top: '36px', zIndex: 50,
                              background: 'white', border: '1px solid var(--border)', borderRadius: '8px',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: '160px', overflow: 'hidden',
                            }} onClick={() => setOpenMenu(null)}>
                              {[
                                { label: 'Send Invoice', icon: '✉' },
                                { label: 'Record Payment', icon: '₹' },
                                { label: 'Download PDF', icon: '⬇' },
                                { label: 'Void Invoice', icon: '⊘', danger: true },
                              ].map(item => (
                                <button key={item.label} style={{
                                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                                  padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                                  fontSize: '13px', color: item.danger ? 'var(--danger)' : 'var(--text-primary)',
                                  textAlign: 'left',
                                }} onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                                   onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                  <span>{item.icon}</span> {item.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    padding: '5px 10px', borderRadius: '6px', border: '1px solid',
                    borderColor: page === p ? 'var(--primary)' : 'var(--border)',
                    background: page === p ? 'var(--primary)' : 'white',
                    color: page === p ? 'white' : 'var(--text-primary)',
                    fontSize: '13px', cursor: 'pointer', fontWeight: page === p ? '600' : '400',
                  }}
                >{p}</button>
              ))}
              <button className="btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
