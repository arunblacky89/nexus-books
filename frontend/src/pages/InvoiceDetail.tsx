import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const fmt = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`

function Skeleton({ w = '100%', h = '14px' }: { w?: string; h?: string }) {
  return <div style={{ width: w, height: h, background: '#F1F5F9', borderRadius: '4px' }} />
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showMore, setShowMore] = useState(false)

  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/invoices/${id}/`).then(r => r.data),
    enabled: !!id,
  })

  const voidMutation = useMutation({
    mutationFn: () => api.post(`/invoices/${id}/void/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', id] }); qc.invalidateQueries({ queryKey: ['invoices'] }) },
  })

  if (isLoading) return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}><Skeleton w="60px" /><Skeleton w="8px" /><Skeleton w="80px" /></div>
      <div className="card" style={{ padding: '24px' }}>
        {Array(6).fill(0).map((_, i) => <div key={i} style={{ marginBottom: '16px' }}><Skeleton w={`${40 + i * 10}%`} h="18px" /></div>)}
      </div>
    </div>
  )

  if (!inv) return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>Invoice not found.</p>
      <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/invoices')}>Back to Invoices</button>
    </div>
  )

  const items = inv.line_items || []
  const payments = inv.payments || []
  const subtotal = items.reduce((s: number, i: any) => s + parseFloat(i.amount || 0), 0)

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: '960px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', fontSize: '13px' }}>
        <Link to="/invoices" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Invoices</Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color: 'var(--text-muted)' }}>{inv.invoice_number}</span>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge badge-${inv.status}`} style={{ fontSize: '13px', padding: '4px 12px' }}>{inv.status?.toUpperCase()}</span>
          <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{inv.invoice_number}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
          <button className="btn-secondary btn-sm" onClick={() => navigate(`/invoices/${id}/edit`)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button className="btn-secondary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Send
          </button>
          <button className="btn-primary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            Record Payment
          </button>
          <div style={{ position: 'relative' }}>
            <button className="btn-secondary btn-sm" onClick={() => setShowMore(v => !v)}>
              More ▾
            </button>
            {showMore && (
              <div style={{
                position: 'absolute', right: 0, top: '36px', zIndex: 50,
                background: 'white', border: '1px solid var(--border)', borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: '180px', overflow: 'hidden',
              }} onClick={() => setShowMore(false)}>
                {[
                  { label: 'Download PDF', icon: '⬇' },
                  { label: 'Duplicate Invoice', icon: '⧉' },
                  { label: 'Print', icon: '🖨' },
                  { label: 'Void Invoice', icon: '⊘', danger: true, action: () => { if (window.confirm('Void this invoice?')) voidMutation.mutate() } },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                    padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '13px', color: item.danger ? 'var(--danger)' : 'var(--text-primary)', textAlign: 'left',
                  }} onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                     onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <span>{item.icon}</span> {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Header Card */}
      <div className="card" style={{ marginBottom: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0', borderBottom: '1px solid var(--border)' }}>
          {[
            { label: 'Invoice Date', value: new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) },
            { label: 'Due Date', value: new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) },
            { label: 'Reference', value: inv.reference || '—' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '16px 20px', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>{item.label}</p>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Bill To */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', padding: '20px' }}>
          <div>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>Bill To</p>
            <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{inv.customer_name}</p>
            {inv.billing_address && (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{inv.billing_address}</p>
            )}
            {inv.customer_gstin && (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>GSTIN: <strong>{inv.customer_gstin}</strong></p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>Balance Due</p>
            <p style={{ fontSize: '28px', fontWeight: '800', color: inv.balance_due > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {fmt(inv.balance_due)}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              of {fmt(inv.total)} total
            </p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="card" style={{ marginBottom: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#F8FAFC' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line Items</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="nb-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Item</th>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'center' }}>Unit</th>
                <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ textAlign: 'center' }}>Tax</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: '500' }}>{item.item_name || item.name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{item.description || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{item.unit || 'Nos'}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(item.rate)}</td>
                  <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{item.tax_rate ? `${item.tax_rate}%` : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: '500' }}>{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Amount Summary */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px' }}>
          <div style={{ width: '300px' }}>
            {[
              { label: 'Subtotal', value: inv.subtotal || subtotal },
              inv.discount_amount > 0 && { label: `Discount (${inv.discount_percent || 0}%)`, value: -inv.discount_amount },
              inv.discount_amount > 0 && { label: 'Taxable Amount', value: (inv.subtotal || subtotal) - inv.discount_amount },
              inv.cgst_amount > 0 && { label: `CGST (${(inv.cgst_rate || 0)}%)`, value: inv.cgst_amount },
              inv.sgst_amount > 0 && { label: `SGST (${(inv.sgst_rate || 0)}%)`, value: inv.sgst_amount },
              inv.igst_amount > 0 && { label: `IGST (${(inv.igst_rate || 0)}%)`, value: inv.igst_amount },
            ].filter(Boolean).map((row: any, i, arr) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontSize: '13px', color: row.value < 0 ? 'var(--success)' : 'var(--text-primary)' }}>
                  {row.value < 0 ? `-${fmt(Math.abs(row.value))}` : fmt(row.value)}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 6px', borderTop: '2px solid var(--border)', marginTop: '4px' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Total</span>
              <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{fmt(inv.total)}</span>
            </div>
            {inv.amount_paid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: '13px', color: 'var(--success)' }}>Amount Paid</span>
                <span style={{ fontSize: '13px', color: 'var(--success)' }}>-{fmt(inv.amount_paid)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: inv.balance_due > 0 ? 'var(--danger-bg)' : 'var(--success-bg)', borderRadius: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: inv.balance_due > 0 ? 'var(--danger)' : 'var(--success)' }}>Balance Due</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: inv.balance_due > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(inv.balance_due)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {(inv.notes || inv.terms) && (
        <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: inv.notes && inv.terms ? '1fr 1fr' : '1fr', gap: '24px' }}>
            {inv.notes && (
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>Notes</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{inv.notes}</p>
              </div>
            )}
            {inv.terms && (
              <div>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>Terms & Conditions</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{inv.terms}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Payment History</h3>
          </div>
          <table className="nb-table">
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Date</th>
                <th>Mode</th>
                <th>Reference</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any, i: number) => (
                <tr key={i}>
                  <td style={{ color: 'var(--primary)', fontWeight: '500' }}>{p.payment_number || `PAY-${String(i + 1).padStart(5, '0')}`}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                  <td>{p.payment_mode || 'Bank Transfer'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: '500', color: 'var(--success)' }}>{fmt(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
