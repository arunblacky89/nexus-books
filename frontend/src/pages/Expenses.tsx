import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const fmt = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n * 100) / 100)}`
const today = new Date().toISOString().split('T')[0]
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

interface ExpenseForm {
  date: string; account: string; vendor: string; description: string
  amount: string; tax_rate: string; reference: string; notes: string
}

const emptyForm = (): ExpenseForm => ({
  date: today, account: '', vendor: '', description: '',
  amount: '', tax_rate: '18', reference: '', notes: '',
})

export default function Expenses() {
  const qc = useQueryClient()
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(today)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<ExpenseForm>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', dateFrom, dateTo, search, page],
    queryFn: () => api.get('/expenses/', {
      params: { date_from: dateFrom || undefined, date_to: dateTo || undefined, search: search || undefined, page, page_size: PAGE_SIZE }
    }).then(r => r.data),
  })

  const { data: accounts } = useQuery({
    queryKey: ['expense-accounts'],
    queryFn: () => api.get('/accounts/?account_type=Expenses&page_size=100').then(r => r.data.results || r.data),
  })

  const { data: vendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: () => api.get('/contacts/?type=vendor&page_size=200').then(r => r.data.results || r.data),
  })

  const expenses = data?.results || []
  const total = data?.count || 0
  const totalAmount = data?.total_amount || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const saveMutation = useMutation({
    mutationFn: (payload: any) => editId
      ? api.put(`/expenses/${editId}/`, payload)
      : api.post('/expenses/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); closeForm() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const openNew = () => { setEditId(null); setForm(emptyForm()); setErrors({}); setShowForm(true) }
  const openEdit = (e: any) => {
    setEditId(e.id)
    setForm({
      date: e.date || today, account: e.account?.toString() || '', vendor: e.vendor?.toString() || '',
      description: e.description || '', amount: e.amount?.toString() || '',
      tax_rate: e.tax_rate?.toString() || '18', reference: e.reference || '', notes: e.notes || '',
    })
    setErrors({}); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm()) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.date) e.date = 'Date is required'
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Valid amount is required'
    if (!form.description.trim()) e.description = 'Description is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const amount = parseFloat(form.amount)
    const taxRate = parseFloat(form.tax_rate) || 0
    const taxAmount = amount * (taxRate / 100)
    saveMutation.mutate({
      date: form.date, account: form.account || null, vendor: form.vendor || null,
      description: form.description, amount, tax_rate: taxRate,
      tax_amount: taxAmount, total: amount + taxAmount,
      reference: form.reference, notes: form.notes,
    })
  }

  const f = (k: keyof ExpenseForm, v: string) => setForm(prev => ({ ...prev, [k]: v }))
  const taxAmt = parseFloat(form.amount || '0') * (parseFloat(form.tax_rate) / 100)
  const totalAmt = parseFloat(form.amount || '0') + taxAmt

  return (
    <div className="fade-in" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Expenses</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {total} records · Total: {fmt(totalAmount)}
          </p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Record Expense
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input className="nb-input" placeholder="Search expenses..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ paddingLeft: '34px' }} />
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
                <th>Date</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ textAlign: 'center' }}>Tax</th>
                <th style={{ textAlign: 'right' }}>Total (₹)</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(8).fill(0).map((_, i) => (
                    <tr key={i}>{Array(8).fill(0).map((_, j) => (
                      <td key={j}><div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: '65%' }} /></td>
                    ))}</tr>
                  ))
                : expenses.length === 0
                ? (
                  <tr><td colSpan={8}>
                    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>No expenses recorded</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>Track your business expenses to get accurate P&L reports</p>
                      <button className="btn-primary" onClick={openNew}>Record Expense</button>
                    </div>
                  </td></tr>
                )
                : expenses.map((exp: any) => (
                  <tr key={exp.id}>
                    <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(exp.date).toLocaleDateString('en-IN')}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{exp.account_name || '—'}</td>
                    <td>{exp.vendor_name || exp.vendor || '—'}</td>
                    <td style={{ maxWidth: '200px' }}>
                      <p style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</p>
                      {exp.reference && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ref: {exp.reference}</p>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '500' }}>{fmt(exp.amount)}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{exp.tax_rate ? `${exp.tax_rate}%` : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(exp.total || exp.amount)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button className="btn-icon btn-sm" onClick={() => openEdit(exp)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-icon btn-sm" onClick={() => { if (window.confirm('Delete expense?')) deleteMutation.mutate(exp.id) }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
            {expenses.length > 0 && (
              <tfoot>
                <tr style={{ background: '#F8FAFC' }}>
                  <td colSpan={4} style={{ padding: '10px 16px', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>Total</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '700' }}>{fmt(expenses.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0))}</td>
                  <td />
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '700' }}>{fmt(expenses.reduce((s: number, e: any) => s + parseFloat(e.total || e.amount || 0), 0))}</td>
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

      {/* Slide-over */}
      {showForm && (
        <>
          <div onClick={closeForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px', background: 'white',
            zIndex: 101, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '700' }}>{editId ? 'Edit Expense' : 'Record Expense'}</h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="nb-label">Date *</label>
                  <input type="date" className="nb-input" value={form.date} onChange={e => f('date', e.target.value)} />
                  {errors.date && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.date}</p>}
                </div>
                <div>
                  <label className="nb-label">Reference</label>
                  <input className="nb-input" placeholder="Bill#, receipt..." value={form.reference} onChange={e => f('reference', e.target.value)} />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Expense Category</label>
                <select className="nb-select" value={form.account} onChange={e => f('account', e.target.value)}>
                  <option value="">— Select Category —</option>
                  {(accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Vendor / Paid To</label>
                <select className="nb-select" value={form.vendor} onChange={e => f('vendor', e.target.value)}>
                  <option value="">— Select Vendor (optional) —</option>
                  {(vendors || []).map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Description *</label>
                <input className="nb-input" placeholder="What was this expense for?" value={form.description} onChange={e => f('description', e.target.value)} />
                {errors.description && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.description}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="nb-label">Amount (₹) *</label>
                  <input className="nb-input" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => f('amount', e.target.value)} />
                  {errors.amount && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.amount}</p>}
                </div>
                <div>
                  <label className="nb-label">GST Rate</label>
                  <select className="nb-select" value={form.tax_rate} onChange={e => f('tax_rate', e.target.value)}>
                    {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>

              {parseFloat(form.amount) > 0 && (
                <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
                    <span>{fmt(parseFloat(form.amount))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>GST ({form.tax_rate}%)</span>
                    <span>{fmt(taxAmt)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', borderTop: '1px solid var(--border)', paddingTop: '6px', fontSize: '13px' }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--primary)' }}>{fmt(totalAmt)}</span>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Notes</label>
                <textarea className="nb-input" rows={3} placeholder="Additional notes..." value={form.notes} onChange={e => f('notes', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={closeForm}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editId ? 'Update' : 'Record Expense'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
