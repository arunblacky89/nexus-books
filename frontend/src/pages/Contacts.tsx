import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const fmt = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`

const TABS = ['All', 'Customers', 'Vendors']

interface ContactForm {
  name: string; email: string; phone: string; gstin: string; pan: string
  contact_type: string; billing_address: string; shipping_address: string
  payment_terms: string; credit_limit: string
}

const emptyForm = (): ContactForm => ({
  name: '', email: '', phone: '', gstin: '', pan: '',
  contact_type: 'customer', billing_address: '', shipping_address: '',
  payment_terms: 'Net 30', credit_limit: '',
})

export default function Contacts() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<ContactForm>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', tab, search, page],
    queryFn: () => api.get('/contacts/', {
      params: {
        type: tab === 'Customers' ? 'customer' : tab === 'Vendors' ? 'vendor' : undefined,
        search: search || undefined, page, page_size: PAGE_SIZE,
      }
    }).then(r => r.data),
  })

  const contacts = data?.results || []
  const total = data?.count || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const saveMutation = useMutation({
    mutationFn: (payload: any) => editId
      ? api.put(`/contacts/${editId}/`, payload)
      : api.post('/contacts/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); closeForm() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/contacts/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })

  const openNew = () => { setEditId(null); setForm(emptyForm()); setErrors({}); setShowForm(true) }
  const openEdit = (c: any) => {
    setEditId(c.id)
    setForm({
      name: c.name || '', email: c.email || '', phone: c.phone || '',
      gstin: c.gstin || '', pan: c.pan || '', contact_type: c.contact_type || 'customer',
      billing_address: c.billing_address || '', shipping_address: c.shipping_address || '',
      payment_terms: c.payment_terms || 'Net 30', credit_limit: c.credit_limit?.toString() || '',
    })
    setErrors({})
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm()) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (form.gstin && form.gstin.length !== 15) e.gstin = 'GSTIN must be 15 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    saveMutation.mutate({ ...form, credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null })
  }

  const f = (k: keyof ContactForm, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="fade-in" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Contacts</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{total} contacts</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Contact
        </button>
      </div>

      <div className="card">
        {/* Tabs + Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => { setTab(t); setPage(1) }} style={{
                padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: tab === t ? '600' : '400',
                color: tab === t ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px', whiteSpace: 'nowrap',
              }}>{t}</button>
            ))}
          </div>
          <div style={{ position: 'relative', padding: '8px 0' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input className="nb-input" placeholder="Search contacts..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ paddingLeft: '34px', width: '220px' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="nb-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>GSTIN</th>
                <th style={{ textAlign: 'right' }}>Outstanding</th>
                <th>Type</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(8).fill(0).map((_, i) => (
                    <tr key={i}>{Array(7).fill(0).map((_, j) => (
                      <td key={j}><div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: '65%' }} /></td>
                    ))}</tr>
                  ))
                : contacts.length === 0
                ? (
                  <tr><td colSpan={7}>
                    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>No contacts found</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>Add customers and vendors to manage your business relationships</p>
                      <button className="btn-primary" onClick={openNew}>Add Contact</button>
                    </div>
                  </td></tr>
                )
                : contacts.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%', background: 'var(--primary-light)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: '700', color: 'var(--primary)', flexShrink: 0,
                        }}>
                          {c.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '1px' }}>{c.name}</p>
                          {c.pan && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PAN: {c.pan}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.email || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.phone || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{c.gstin || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '500', color: c.outstanding > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {c.outstanding != null ? fmt(c.outstanding) : '—'}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '600',
                        background: c.contact_type === 'customer' ? '#EFF6FF' : '#F5F3FF',
                        color: c.contact_type === 'customer' ? '#1D4ED8' : '#7C3AED',
                      }}>{c.contact_type}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button className="btn-icon btn-sm" title="Edit" onClick={() => openEdit(c)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-icon btn-sm" title="Delete" onClick={() => { if (window.confirm('Delete this contact?')) deleteMutation.mutate(c.id) }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        </button>
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
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over form */}
      {showForm && (
        <>
          <div onClick={closeForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: 'white',
            zIndex: 101, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {editId ? 'Edit Contact' : 'New Contact'}
              </h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Contact Type</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  {[{ val: 'customer', label: 'Customer' }, { val: 'vendor', label: 'Vendor' }].map(t => (
                    <label key={t.val} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                      <input type="radio" name="ctype" value={t.val} checked={form.contact_type === t.val} onChange={() => f('contact_type', t.val)} />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              {[
                { key: 'name', label: 'Full Name *', placeholder: 'Acme Corp Pvt Ltd' },
                { key: 'email', label: 'Email Address', placeholder: 'accounts@acme.com' },
                { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
                { key: 'gstin', label: 'GSTIN', placeholder: '27AABCU9603R1ZX' },
                { key: 'pan', label: 'PAN', placeholder: 'AABCU9603R' },
                { key: 'credit_limit', label: 'Credit Limit (₹)', placeholder: '50000', type: 'number' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} style={{ marginBottom: '14px' }}>
                  <label className="nb-label">{label}</label>
                  <input className="nb-input" type={type || 'text'} placeholder={placeholder}
                    value={form[key as keyof ContactForm]}
                    onChange={e => f(key as keyof ContactForm, e.target.value)} />
                  {errors[key] && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors[key]}</p>}
                </div>
              ))}

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Payment Terms</label>
                <select className="nb-select" value={form.payment_terms} onChange={e => f('payment_terms', e.target.value)}>
                  {['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Billing Address</label>
                <textarea className="nb-input" rows={3} placeholder="123 MG Road, Mumbai, Maharashtra 400001"
                  value={form.billing_address} onChange={e => f('billing_address', e.target.value)} style={{ resize: 'vertical' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Shipping Address</label>
                <textarea className="nb-input" rows={3} placeholder="Same as billing..."
                  value={form.shipping_address} onChange={e => f('shipping_address', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={closeForm}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editId ? 'Update Contact' : 'Add Contact'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
