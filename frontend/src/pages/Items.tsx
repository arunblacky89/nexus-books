import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const fmt = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n * 100) / 100)}`
const TAX_RATES = [0, 5, 12, 18, 28]
const ITEM_TYPES = ['Goods', 'Service']
const UNITS = ['Nos', 'Kg', 'Ltr', 'Mtr', 'Box', 'Pcs', 'Hr', 'Day', 'Month']

interface ItemForm {
  name: string; sku: string; item_type: string; hsn_sac: string
  selling_price: string; purchase_price: string; tax_rate: string
  description: string; unit: string; opening_stock: string
}

const emptyForm = (): ItemForm => ({
  name: '', sku: '', item_type: 'Goods', hsn_sac: '',
  selling_price: '', purchase_price: '', tax_rate: '18',
  description: '', unit: 'Nos', opening_stock: '0',
})

export default function Items() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<ItemForm>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['items', search, typeFilter, page],
    queryFn: () => api.get('/items/', {
      params: {
        search: search || undefined,
        item_type: typeFilter !== 'All' ? typeFilter : undefined,
        page, page_size: PAGE_SIZE,
      }
    }).then(r => r.data),
  })

  const items = data?.results || []
  const total = data?.count || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const saveMutation = useMutation({
    mutationFn: (payload: any) => editId
      ? api.put(`/items/${editId}/`, payload)
      : api.post('/items/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); closeForm() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/items/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  })

  const openNew = () => { setEditId(null); setForm(emptyForm()); setErrors({}); setShowForm(true) }
  const openEdit = (it: any) => {
    setEditId(it.id)
    setForm({
      name: it.name || '', sku: it.sku || '', item_type: it.item_type || 'Goods',
      hsn_sac: it.hsn_sac || '', selling_price: it.selling_price?.toString() || '',
      purchase_price: it.purchase_price?.toString() || '', tax_rate: it.tax_rate?.toString() || '18',
      description: it.description || '', unit: it.unit || 'Nos',
      opening_stock: it.opening_stock?.toString() || '0',
    })
    setErrors({}); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm()) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (form.selling_price && isNaN(parseFloat(form.selling_price))) e.selling_price = 'Must be a number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    saveMutation.mutate({
      ...form,
      selling_price: form.selling_price ? parseFloat(form.selling_price) : 0,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : 0,
      tax_rate: parseFloat(form.tax_rate),
      opening_stock: parseFloat(form.opening_stock) || 0,
    })
  }

  const f = (k: keyof ItemForm, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="fade-in" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Items & Services</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{total} items</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Item
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input className="nb-input" placeholder="Search items, SKU..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ paddingLeft: '34px' }} />
          </div>
          <select className="nb-select" style={{ width: 'auto' }} value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
            <option value="All">All Types</option>
            {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="nb-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Type</th>
                <th>HSN / SAC</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Selling Price</th>
                <th style={{ textAlign: 'right' }}>Purchase Price</th>
                <th style={{ textAlign: 'center' }}>Tax Rate</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(8).fill(0).map((_, i) => (
                    <tr key={i}>{Array(9).fill(0).map((_, j) => (
                      <td key={j}><div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: '60%' }} /></td>
                    ))}</tr>
                  ))
                : items.length === 0
                ? (
                  <tr><td colSpan={9}>
                    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>No items yet</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>Add products and services to use in invoices and bills</p>
                      <button className="btn-primary" onClick={openNew}>Add Item</button>
                    </div>
                  </td></tr>
                )
                : items.map((it: any) => (
                  <tr key={it.id}>
                    <td>
                      <p style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '1px' }}>{it.name}</p>
                      {it.description && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{it.description.substring(0, 40)}{it.description.length > 40 ? '...' : ''}</p>}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{it.sku || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: '600',
                        background: it.item_type === 'Goods' ? '#F0FDF4' : '#EFF6FF',
                        color: it.item_type === 'Goods' ? '#16A34A' : '#1D4ED8',
                      }}>{it.item_type}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{it.hsn_sac || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{it.unit || 'Nos'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '500' }}>{it.selling_price != null ? fmt(it.selling_price) : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{it.purchase_price != null ? fmt(it.purchase_price) : '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', padding: '2px 8px', borderRadius: '99px', fontSize: '12px', fontWeight: '600',
                        background: '#FFFBEB', color: '#D97706',
                      }}>{it.tax_rate}%</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button className="btn-icon btn-sm" onClick={() => openEdit(it)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-icon btn-sm" onClick={() => { if (window.confirm('Delete this item?')) deleteMutation.mutate(it.id) }}>
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

      {/* Slide-over */}
      {showForm && (
        <>
          <div onClick={closeForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px', background: 'white',
            zIndex: 101, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '700' }}>{editId ? 'Edit Item' : 'New Item'}</h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Item Type</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  {ITEM_TYPES.map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="radio" name="itype" value={t} checked={form.item_type === t} onChange={() => f('item_type', t)} /> {t}
                    </label>
                  ))}
                </div>
              </div>

              {[
                { key: 'name', label: 'Item Name *', placeholder: 'Web Design Services' },
                { key: 'sku', label: 'SKU / Item Code', placeholder: 'WDS-001' },
                { key: 'hsn_sac', label: form.item_type === 'Service' ? 'SAC Code' : 'HSN Code', placeholder: form.item_type === 'Service' ? '998314' : '8471' },
                { key: 'description', label: 'Description', placeholder: 'Brief description...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: '14px' }}>
                  <label className="nb-label">{label}</label>
                  <input className="nb-input" placeholder={placeholder}
                    value={form[key as keyof ItemForm]} onChange={e => f(key as keyof ItemForm, e.target.value)} />
                  {errors[key] && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors[key]}</p>}
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="nb-label">Selling Price (₹)</label>
                  <input className="nb-input" type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.selling_price} onChange={e => f('selling_price', e.target.value)} />
                </div>
                <div>
                  <label className="nb-label">Purchase Price (₹)</label>
                  <input className="nb-input" type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.purchase_price} onChange={e => f('purchase_price', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="nb-label">GST Rate</label>
                  <select className="nb-select" value={form.tax_rate} onChange={e => f('tax_rate', e.target.value)}>
                    {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div>
                  <label className="nb-label">Unit</label>
                  <select className="nb-select" value={form.unit} onChange={e => f('unit', e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {form.item_type === 'Goods' && (
                <div style={{ marginBottom: '14px' }}>
                  <label className="nb-label">Opening Stock</label>
                  <input className="nb-input" type="number" min="0" step="0.01" placeholder="0"
                    value={form.opening_stock} onChange={e => f('opening_stock', e.target.value)} />
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={closeForm}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editId ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
