import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const fmt = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n * 100) / 100)}`

interface LineItem {
  item_id: string
  item_name: string
  description: string
  quantity: number
  unit: string
  rate: number
  discount_percent: number
  tax_rate: number
  amount: number
}

const TAX_RATES = [0, 5, 12, 18, 28]
const UNITS = ['Nos', 'Kg', 'Ltr', 'Mtr', 'Box', 'Pcs', 'Hr', 'Day', 'Month']
const PAYMENT_TERMS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Custom']

function emptyLine(): LineItem {
  return { item_id: '', item_name: '', description: '', quantity: 1, unit: 'Nos', rate: 0, discount_percent: 0, tax_rate: 18, amount: 0 }
}

function calcLine(l: LineItem): number {
  const base = l.quantity * l.rate
  const disc = base * (l.discount_percent / 100)
  const taxable = base - disc
  const tax = taxable * (l.tax_rate / 100)
  return taxable + tax
}

function calcSubtotal(lines: LineItem[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.rate * (1 - l.discount_percent / 100), 0)
}

function calcTax(lines: LineItem[]): number {
  return lines.reduce((s, l) => {
    const taxable = l.quantity * l.rate * (1 - l.discount_percent / 100)
    return s + taxable * (l.tax_rate / 100)
  }, 0)
}

export default function InvoiceForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = !!id
  const today = new Date().toISOString().split('T')[0]
  const due30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const [form, setForm] = useState({
    customer_id: '',
    invoice_date: today,
    due_date: due30,
    reference: '',
    payment_terms: 'Net 30',
    supply_type: 'intra',
    notes: '',
    terms: '',
    discount_percent: 0,
  })
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const { data: contacts } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: () => api.get('/contacts/?type=customer&page_size=200').then(r => r.data.results || r.data),
  })
  const { data: items } = useQuery({
    queryKey: ['items-list'],
    queryFn: () => api.get('/items/?page_size=200').then(r => r.data.results || r.data),
  })
  const { data: existing } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/invoices/${id}/`).then(r => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        customer_id: existing.customer?.toString() || '',
        invoice_date: existing.invoice_date || today,
        due_date: existing.due_date || due30,
        reference: existing.reference || '',
        payment_terms: existing.payment_terms || 'Net 30',
        supply_type: existing.supply_type || 'intra',
        notes: existing.notes || '',
        terms: existing.terms || '',
        discount_percent: existing.discount_percent || 0,
      })
      if (existing.line_items?.length) setLines(existing.line_items.map((l: any) => ({
        item_id: l.item?.toString() || '',
        item_name: l.item_name || '',
        description: l.description || '',
        quantity: l.quantity || 1,
        unit: l.unit || 'Nos',
        rate: l.rate || 0,
        discount_percent: l.discount_percent || 0,
        tax_rate: l.tax_rate || 18,
        amount: l.amount || 0,
      })))
    }
  }, [existing])

  const mutation = useMutation({
    mutationFn: (payload: any) => isEdit
      ? api.put(`/invoices/${id}/`, payload)
      : api.post('/invoices/', payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      navigate(`/invoices/${res.data.id}`)
    },
  })

  const selectedContact = (contacts || []).find((c: any) => c.id?.toString() === form.customer_id)
  const subtotal = calcSubtotal(lines)
  const discountAmt = subtotal * (form.discount_percent / 100)
  const taxableAmt = subtotal - discountAmt
  const taxAmt = calcTax(lines)
  const total = taxableAmt + taxAmt

  const cgst = form.supply_type === 'intra' ? taxAmt / 2 : 0
  const sgst = form.supply_type === 'intra' ? taxAmt / 2 : 0
  const igst = form.supply_type === 'inter' ? taxAmt : 0

  const updateLine = (i: number, field: keyof LineItem, value: any) => {
    setLines(prev => {
      const next = [...prev]
      const updated = { ...next[i], [field]: value }
      if (field === 'item_id' && items) {
        const item = items.find((it: any) => it.id?.toString() === value)
        if (item) {
          updated.item_name = item.name
          updated.rate = item.selling_price || 0
          updated.tax_rate = item.tax_rate || 18
        }
      }
      updated.amount = calcLine(updated)
      next[i] = updated
      return next
    })
  }

  const addLine = () => setLines(prev => [...prev, emptyLine()])
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.customer_id) e.customer_id = 'Customer is required'
    if (!form.invoice_date) e.invoice_date = 'Invoice date is required'
    if (!form.due_date) e.due_date = 'Due date is required'
    if (lines.every(l => !l.item_name && l.rate === 0)) e.lines = 'Add at least one line item'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (sendNow = false) => {
    if (!validate()) return
    const payload = {
      customer: form.customer_id,
      invoice_date: form.invoice_date,
      due_date: form.due_date,
      reference: form.reference,
      payment_terms: form.payment_terms,
      supply_type: form.supply_type,
      notes: form.notes,
      terms: form.terms,
      discount_percent: form.discount_percent,
      status: sendNow ? 'sent' : 'draft',
      line_items: lines.filter(l => l.item_name || l.rate > 0),
    }
    mutation.mutate(payload)
  }

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
          {isEdit ? `Edit ${existing?.invoice_number || 'Invoice'}` : 'New Invoice'}
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary btn-sm" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn-secondary btn-sm" onClick={() => handleSubmit(false)} disabled={mutation.isPending}>
            Save as Draft
          </button>
          <button className="btn-primary btn-sm" onClick={() => handleSubmit(true)} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save & Send'}
          </button>
        </div>
      </div>

      {mutation.isError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: 'var(--danger)' }}>
          Failed to save invoice. Please check your inputs and try again.
        </div>
      )}

      <div className="card" style={{ marginBottom: '16px', padding: '24px' }}>
        {/* 2-column header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* Left column */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="nb-label">Invoice Date *</label>
                <input type="date" className={`nb-input${errors.invoice_date ? ' is-invalid' : ''}`}
                  value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
                {errors.invoice_date && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.invoice_date}</p>}
              </div>
              <div>
                <label className="nb-label">Due Date *</label>
                <input type="date" className={`nb-input${errors.due_date ? ' is-invalid' : ''}`}
                  value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <label className="nb-label">Reference #</label>
                <input className="nb-input" placeholder="PO number, etc." value={form.reference}
                  onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
              <div>
                <label className="nb-label">Payment Terms</label>
                <select className="nb-select" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}>
                  {PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="nb-label">Supply Type</label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                {(['intra', 'inter'] as const).map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="radio" name="supply_type" value={t} checked={form.supply_type === t}
                      onChange={() => setForm(f => ({ ...f, supply_type: t }))} />
                    <span style={{ fontWeight: form.supply_type === t ? '600' : '400' }}>
                      {t === 'intra' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right column - Customer */}
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label className="nb-label">Customer *</label>
              <select
                className={`nb-select${errors.customer_id ? ' is-invalid' : ''}`}
                value={form.customer_id}
                onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
              >
                <option value="">— Select Customer —</option>
                {(contacts || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.customer_id && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.customer_id}</p>}
            </div>

            {selectedContact && (
              <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>Bill To</p>
                <p style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>{selectedContact.name}</p>
                {selectedContact.billing_address && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{selectedContact.billing_address}</p>
                )}
                {selectedContact.gstin && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>GSTIN: {selectedContact.gstin}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="card" style={{ marginBottom: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line Items</h3>
        </div>
        {errors.lines && <p style={{ color: 'var(--danger)', fontSize: '12px', padding: '8px 20px' }}>{errors.lines}</p>}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Item', 'Description', 'Qty', 'Unit', 'Rate (₹)', 'Disc %', 'Tax', 'Amount', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 12px', textAlign: i >= 2 ? 'center' : 'left', fontSize: '11px',
                    fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase',
                    letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 12px', minWidth: '180px' }}>
                    <select className="nb-select" value={line.item_id} onChange={e => updateLine(i, 'item_id', e.target.value)}
                      style={{ fontSize: '13px' }}>
                      <option value="">Type or select...</option>
                      {(items || []).map((it: any) => <option key={it.id} value={it.id}>{it.name}</option>)}
                    </select>
                    {!line.item_id && (
                      <input className="nb-input" placeholder="Custom item" value={line.item_name}
                        onChange={e => updateLine(i, 'item_name', e.target.value)}
                        style={{ marginTop: '4px', fontSize: '13px' }} />
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', minWidth: '160px' }}>
                    <input className="nb-input" placeholder="Description" value={line.description}
                      onChange={e => updateLine(i, 'description', e.target.value)} style={{ fontSize: '13px' }} />
                  </td>
                  <td style={{ padding: '8px 12px', width: '70px' }}>
                    <input className="nb-input" type="number" min="0" step="0.01" value={line.quantity}
                      onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)}
                      style={{ fontSize: '13px', textAlign: 'center' }} />
                  </td>
                  <td style={{ padding: '8px 12px', width: '90px' }}>
                    <select className="nb-select" value={line.unit} onChange={e => updateLine(i, 'unit', e.target.value)}
                      style={{ fontSize: '13px' }}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '8px 12px', width: '110px' }}>
                    <input className="nb-input" type="number" min="0" step="0.01" value={line.rate}
                      onChange={e => updateLine(i, 'rate', parseFloat(e.target.value) || 0)}
                      style={{ fontSize: '13px', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '8px 12px', width: '80px' }}>
                    <input className="nb-input" type="number" min="0" max="100" step="0.01" value={line.discount_percent}
                      onChange={e => updateLine(i, 'discount_percent', parseFloat(e.target.value) || 0)}
                      style={{ fontSize: '13px', textAlign: 'center' }} />
                  </td>
                  <td style={{ padding: '8px 12px', width: '90px' }}>
                    <select className="nb-select" value={line.tax_rate} onChange={e => updateLine(i, 'tax_rate', parseFloat(e.target.value))}
                      style={{ fontSize: '13px' }}>
                      {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '8px 12px', width: '120px', textAlign: 'right', fontWeight: '500', fontSize: '13px' }}>
                    {fmt(calcLine(line))}
                  </td>
                  <td style={{ padding: '8px 12px', width: '40px', textAlign: 'center' }}>
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(i)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8',
                        padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center',
                      }} title="Remove">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9' }}>
          <button className="btn-secondary btn-sm" onClick={addLine}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Line
          </button>
        </div>
      </div>

      {/* Bottom: Notes + Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' }}>
        <div>
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label className="nb-label">Notes (visible to customer)</label>
              <textarea className="nb-input" rows={3} placeholder="Thank you for your business..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label className="nb-label">Terms & Conditions</label>
              <textarea className="nb-input" rows={3} placeholder="Payment is due within 30 days..."
                value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        {/* Amount Summary */}
        <div className="card" style={{ padding: '20px', alignSelf: 'start' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Summary</h3>

          <div style={{ marginBottom: '12px' }}>
            <label className="nb-label">Discount (%)</label>
            <input className="nb-input" type="number" min="0" max="100" step="0.01" value={form.discount_percent}
              onChange={e => setForm(f => ({ ...f, discount_percent: parseFloat(e.target.value) || 0 }))} />
          </div>

          {[
            { label: 'Subtotal', value: subtotal },
            form.discount_percent > 0 && { label: `Discount (${form.discount_percent}%)`, value: -discountAmt },
            form.discount_percent > 0 && { label: 'Taxable Amount', value: taxableAmt },
            form.supply_type === 'intra' ? { label: 'CGST', value: cgst } : null,
            form.supply_type === 'intra' ? { label: 'SGST', value: sgst } : null,
            form.supply_type === 'inter' ? { label: 'IGST', value: igst } : null,
          ].filter(Boolean).map((row: any, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
              <span style={{ color: row.value < 0 ? 'var(--success)' : 'var(--text-primary)', fontWeight: '500' }}>
                {row.value < 0 ? `-${fmt(Math.abs(row.value))}` : fmt(row.value)}
              </span>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 6px', borderTop: '2px solid var(--border)', marginTop: '4px' }}>
            <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Total</span>
            <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)' }}>{fmt(total)}</span>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => handleSubmit(false)} disabled={mutation.isPending}>
              Save as Draft
            </button>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => handleSubmit(true)} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save & Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
