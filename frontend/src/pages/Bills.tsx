import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const fmt = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`
const STATUS_TABS = ['All', 'Draft', 'Open', 'Paid', 'Overdue', 'Void']

function SkeletonRow() {
  return (
    <tr>
      {Array(8).fill(0).map((_, i) => (
        <td key={i}><div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: i === 1 ? '70%' : '50%' }} /></td>
      ))}
    </tr>
  )
}

export default function Bills() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const { data, isLoading } = useQuery({
    queryKey: ['bills', activeTab, search, dateFrom, dateTo, page],
    queryFn: () => api.get('/bills/', {
      params: {
        status: activeTab !== 'All' ? activeTab.toLowerCase() : undefined,
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page, page_size: PAGE_SIZE,
      }
    }).then(r => r.data),
  })

  const voidMutation = useMutation({
    mutationFn: (id: number) => api.post(`/bills/${id}/void/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
  })

  const bills = data?.results || []
  const total = data?.count || 0
  const counts = data?.status_counts || {}
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="fade-in" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Bills</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Vendor invoices — {total} records</p>
        </div>
        <button className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Bill
        </button>
      </div>

      <div className="card">
        {/* Status Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', overflowX: 'auto' }}>
          {STATUS_TABS.map(tab => {
            const key = tab.toLowerCase()
            const count = tab === 'All' ? total : (counts[key] || 0)
            return (
              <button key={tab} onClick={() => { setActiveTab(tab); setPage(1) }} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: activeTab === tab ? '600' : '400',
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                whiteSpace: 'nowrap', marginBottom: '-1px',
              }}>
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

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input className="nb-input" placeholder="Search bill# or vendor..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ paddingLeft: '34px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="date" className="nb-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '150px' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>to</span>
            <input type="date" className="nb-input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '150px' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="nb-table">
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Vendor</th>
                <th>Bill Date</th>
                <th>Due Date</th>
                <th style={{ textAlign: 'right' }}>Total (₹)</th>
                <th style={{ textAlign: 'right' }}>Balance Due (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(8).fill(0).map((_, i) => <SkeletonRow key={i} />)
                : bills.length === 0
                ? (
                  <tr><td colSpan={8}>
                    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>No bills found</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>Enter vendor bills to track your payables accurately</p>
                      <button className="btn-primary">Create Bill</button>
                    </div>
                  </td></tr>
                )
                : bills.map((bill: any) => (
                  <tr key={bill.id}>
                    <td style={{ color: 'var(--primary)', fontWeight: '600' }}>{bill.bill_number}</td>
                    <td>
                      <p style={{ fontWeight: '500' }}>{bill.vendor_name}</p>
                      {bill.reference && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ref: {bill.reference}</p>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(bill.bill_date).toLocaleDateString('en-IN')}</td>
                    <td style={{ color: bill.status === 'overdue' ? 'var(--danger)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(bill.due_date).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '500' }}>{fmt(bill.total)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '500', color: bill.balance_due > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {fmt(bill.balance_due)}
                    </td>
                    <td><span className={`badge badge-${bill.status}`}>{bill.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button className="btn-icon btn-sm" title="View">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button className="btn-icon btn-sm" title="Record Payment" style={{ color: 'var(--success)' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                        </button>
                        {bill.status !== 'void' && bill.status !== 'paid' && (
                          <button className="btn-icon btn-sm" title="Void"
                            onClick={() => { if (window.confirm('Void this bill?')) voidMutation.mutate(bill.id) }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE,total)} of {total}</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn-secondary btn-sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{
                  padding: '5px 10px', borderRadius: '6px', border: '1px solid',
                  borderColor: page === p ? 'var(--primary)' : 'var(--border)',
                  background: page === p ? 'var(--primary)' : 'white',
                  color: page === p ? 'white' : 'var(--text-primary)',
                  fontSize: '13px', cursor: 'pointer',
                }}>{p}</button>
              ))}
              <button className="btn-secondary btn-sm" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
