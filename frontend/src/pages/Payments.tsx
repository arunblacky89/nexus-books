import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const fmt = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`
const PAYMENT_MODES = ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'Credit Card', 'Debit Card', 'Other']
const today = new Date().toISOString().split('T')[0]

interface PaymentForm {
  payment_date: string; contact: string; amount: string
  payment_mode: string; reference: string; notes: string
  payment_type: string
}

const emptyForm = (type = 'received'): PaymentForm => ({
  payment_date: today, contact: '', amount: '',
  payment_mode: 'Bank Transfer', reference: '', notes: '', payment_type: type,
})

export default function Payments() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'received' | 'made'>('received')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<PaymentForm>(emptyForm('received'))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['payments', activeTab, search, dateFrom, dateTo, page],
    queryFn: () => api.get('/payments/', {
      params: {
        payment_type: activeTab, search: search || undefined,
        date_from: dateFrom || undefined, date_to: dateTo || undefined,
        page, page_size: PAGE_SIZE,
      }
    }).then(r => r.data),
  })

  const { data: contacts } = useQuery({
    queryKey: ['all-contacts'],
    queryFn: () => api.get('/contacts/?page_size=200').then(r => r.data.results || r.data),
  })

  const payments = data?.results || []
  const total = data?.count || 0
  const totalAmount = data?.total_amount || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.post('/payments/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); closeForm() },
  })

  const openNew = () => { setForm(emptyForm(activeTab)); setErrors({}); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setForm(emptyForm(activeTab)) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.payment_date) e.payment_date = 'Date required'
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Valid amount required'
    if (!form.contact) e.contact = 'Contact required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    saveMutation.mutate({ ...form, amount: parseFloat(form.amount), payment_type: activeTab })
  }

  const f = (k: keyof PaymentForm, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const modeIcon: Record<string, string> = {
    'Bank Transfer': '🏦', 'Cash': '💵', 'Cheque': '📝',
    'UPI': '📱', 'Credit Card': '💳', 'Debit Card': '💳', 'Other': '•',
  }

  return (
    <div className="fade-in" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Payments</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {total} records · Total: {fmt(totalAmount)}
          </p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {activeTab === 'received' ? 'Record Receipt' : 'Record Payment'}
        </button>
      </div>

      <div className="card">
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
          {(['received', 'made'] as const).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setPage(1) }} style={{
              padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: activeTab === tab ? '600' : '400',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {tab === 'received' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
              )}
              {tab === 'received' ? 'Received' : 'Made'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input className="nb-input" placeholder="Search payments..." value={search}
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
                <th>Payment #</th>
                <th>{activeTab === 'received' ? 'Customer' : 'Vendor'}</th>
                <th>Date</th>
                <th>Mode</th>
                <th>Reference</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                <th>Invoice / Bill</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(8).fill(0).map((_, i) => (
                    <tr key={i}>{Array(7).fill(0).map((_, j) => (
                      <td key={j}><div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: '65%' }} /></td>
                    ))}</tr>
                  ))
                : payments.length === 0
                ? (
                  <tr><td colSpan={7}>
                    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>No payments {activeTab}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                        {activeTab === 'received' ? 'Record payments received from customers' : 'Record payments made to vendors'}
                      </p>
                      <button className="btn-primary" onClick={openNew}>Record Payment</button>
                    </div>
                  </td></tr>
                )
                : payments.map((p: any) => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--primary)', fontWeight: '600' }}>{p.payment_number}</td>
                    <td style={{ fontWeight: '500' }}>{p.contact_name}</td>
                    <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        <span>{modeIcon[p.payment_mode] || '•'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{p.payment_mode}</span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{p.reference || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: activeTab === 'received' ? 'var(--success)' : 'var(--danger)' }}>
                      {activeTab === 'received' ? '+' : '-'}{fmt(p.amount)}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--primary)' }}>
                      {p.invoice_number || p.bill_number || '—'}
                    </td>
                  </tr>
                ))
              }
            </tbody>
            {payments.length > 0 && (
              <tfoot>
                <tr style={{ background: '#F8FAFC' }}>
                  <td colSpan={5} style={{ padding: '10px 16px', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>Total</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '700', color: activeTab === 'received' ? 'var(--success)' : 'var(--danger)' }}>
                    {fmt(payments.reduce((s: number, p: any) => s + parseFloat(p.amount || 0), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE,total)} of {total}</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn-secondary btn-sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</button>
              <button className="btn-secondary btn-sm" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Form Slide-over */}
      {showForm && (
        <>
          <div onClick={closeForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px', background: 'white',
            zIndex: 101, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '700' }}>
                {activeTab === 'received' ? 'Record Payment Received' : 'Record Payment Made'}
              </h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">{activeTab === 'received' ? 'Customer *' : 'Vendor *'}</label>
                <select className="nb-select" value={form.contact} onChange={e => f('contact', e.target.value)}>
                  <option value="">— Select Contact —</option>
                  {(contacts || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.contact && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.contact}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="nb-label">Payment Date *</label>
                  <input type="date" className="nb-input" value={form.payment_date} onChange={e => f('payment_date', e.target.value)} />
                  {errors.payment_date && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.payment_date}</p>}
                </div>
                <div>
                  <label className="nb-label">Amount (₹) *</label>
                  <input className="nb-input" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => f('amount', e.target.value)} />
                  {errors.amount && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.amount}</p>}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Payment Mode</label>
                <select className="nb-select" value={form.payment_mode} onChange={e => f('payment_mode', e.target.value)}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Reference / Transaction ID</label>
                <input className="nb-input" placeholder="UPI ref, cheque#, etc." value={form.reference} onChange={e => f('reference', e.target.value)} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Notes</label>
                <textarea className="nb-input" rows={3} placeholder="Optional notes..." value={form.notes} onChange={e => f('notes', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={closeForm}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
