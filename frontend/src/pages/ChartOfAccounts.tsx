import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const fmt = (n: number) => {
  const abs = Math.abs(Math.round(n * 100) / 100)
  return `₹${new Intl.NumberFormat('en-IN').format(abs)}`
}

const ACCOUNT_GROUPS = [
  { key: 'Assets', label: 'Assets', color: '#0066CC', bg: '#EFF6FF', icon: '🏛' },
  { key: 'Liabilities', label: 'Liabilities', color: '#DC2626', bg: '#FEF2F2', icon: '📋' },
  { key: 'Equity', label: 'Equity', color: '#7C3AED', bg: '#F5F3FF', icon: '⚖' },
  { key: 'Revenue', label: 'Revenue', color: '#16A34A', bg: '#F0FDF4', icon: '📈' },
  { key: 'Expenses', label: 'Expenses', color: '#EA580C', bg: '#FFF7ED', icon: '📉' },
]

const ACCOUNT_SUBTYPES: Record<string, string[]> = {
  Assets: ['Current Assets', 'Fixed Assets', 'Bank', 'Cash', 'Other Assets'],
  Liabilities: ['Current Liabilities', 'Long-term Liabilities', 'Credit Card', 'Other Liabilities'],
  Equity: ['Owner\'s Equity', 'Retained Earnings', 'Other Equity'],
  Revenue: ['Operating Revenue', 'Other Income'],
  Expenses: ['Cost of Goods Sold', 'Operating Expenses', 'Administrative', 'Other Expenses'],
}

interface AccountForm {
  code: string; name: string; account_type: string
  account_subtype: string; description: string; parent: string
}

const emptyForm = (type = 'Assets'): AccountForm => ({
  code: '', name: '', account_type: type, account_subtype: '', description: '', parent: '',
})

export default function ChartOfAccounts() {
  const qc = useQueryClient()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Assets', 'Revenue', 'Expenses']))
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<AccountForm>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts/?page_size=500').then(r => r.data.results || r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: any) => editId
      ? api.put(`/accounts/${editId}/`, payload)
      : api.post('/accounts/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); closeForm() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/accounts/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })

  const accounts = Array.isArray(data) ? data : []

  const grouped = ACCOUNT_GROUPS.reduce((acc, g) => {
    acc[g.key] = accounts.filter((a: any) => a.account_type === g.key)
    return acc
  }, {} as Record<string, any[]>)

  const toggleGroup = (key: string) => setExpandedGroups(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const openNew = (type?: string) => {
    setEditId(null)
    setForm(emptyForm(type || 'Assets'))
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (acct: any) => {
    setEditId(acct.id)
    setForm({
      code: acct.code || '', name: acct.name || '',
      account_type: acct.account_type || 'Assets',
      account_subtype: acct.account_subtype || '', description: acct.description || '',
      parent: acct.parent?.toString() || '',
    })
    setErrors({})
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm()) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Account name is required'
    if (!form.account_type) e.account_type = 'Type is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    saveMutation.mutate({ ...form, parent: form.parent || null })
  }

  const f = (k: keyof AccountForm, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const totalByGroup = (key: string) =>
    grouped[key]?.reduce((s: number, a: any) => s + parseFloat(a.balance || 0), 0) || 0

  return (
    <div className="fade-in" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Chart of Accounts</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {accounts.length} accounts across {ACCOUNT_GROUPS.length} types
          </p>
        </div>
        <button className="btn-primary" onClick={() => openNew()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Account
        </button>
      </div>

      {isLoading ? (
        <div>
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="card" style={{ marginBottom: '12px', padding: '16px 20px' }}>
              <div style={{ height: '18px', background: '#F1F5F9', borderRadius: '4px', width: '15%', marginBottom: '12px' }} />
              {Array(3).fill(0).map((_, j) => (
                <div key={j} style={{ height: '14px', background: '#F8FAFC', borderRadius: '4px', width: `${40 + j * 15}%`, marginBottom: '8px', marginLeft: '16px' }} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ACCOUNT_GROUPS.map(grp => {
            const grpAccounts = grouped[grp.key] || []
            const isExpanded = expandedGroups.has(grp.key)
            const grpTotal = totalByGroup(grp.key)

            return (
              <div key={grp.key} className="card" style={{ overflow: 'hidden' }}>
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(grp.key)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 20px', background: grp.bg, border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>{grp.icon}</span>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: grp.color }}>{grp.label}</span>
                      <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: '8px' }}>({grpAccounts.length} accounts)</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: grp.color }}>{fmt(grpTotal)}</span>
                    <button
                      onClick={e => { e.stopPropagation(); openNew(grp.key) }}
                      style={{
                        padding: '3px 10px', border: `1px solid ${grp.color}`, borderRadius: '6px',
                        background: 'white', color: grp.color, fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      }}
                    >+ Add</button>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={grp.color} strokeWidth="2"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>

                {/* Accounts Table */}
                {isExpanded && (
                  grpAccounts.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No {grp.label.toLowerCase()} accounts yet.{' '}
                      <button onClick={() => openNew(grp.key)} style={{ background: 'none', border: 'none', color: grp.color, cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                        Add one →
                      </button>
                    </div>
                  ) : (
                    <table className="nb-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Account Name</th>
                          <th>Sub-type</th>
                          <th>Description</th>
                          <th style={{ textAlign: 'right' }}>Balance (₹)</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grpAccounts.map((acct: any) => (
                          <tr key={acct.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>
                              {acct.code || '—'}
                            </td>
                            <td>
                              <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{acct.name}</p>
                              {acct.parent_name && (
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>↳ {acct.parent_name}</p>
                              )}
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{acct.account_subtype || '—'}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '12px', maxWidth: '200px' }}>
                              {acct.description ? acct.description.substring(0, 50) + (acct.description.length > 50 ? '...' : '') : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '600', color: parseFloat(acct.balance) >= 0 ? grp.color : 'var(--danger)' }}>
                              {acct.balance != null ? (
                                <>
                                  {parseFloat(acct.balance) < 0 ? '-' : ''}{fmt(acct.balance)}
                                </>
                              ) : '—'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button className="btn-icon btn-sm" onClick={() => openEdit(acct)}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button className="btn-icon btn-sm" onClick={() => { if (window.confirm('Delete account?')) deleteMutation.mutate(acct.id) }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Form Slide-over */}
      {showForm && (
        <>
          <div onClick={closeForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px', background: 'white',
            zIndex: 101, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '700' }}>{editId ? 'Edit Account' : 'New Account'}</h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="nb-label">Account Type *</label>
                  <select className="nb-select" value={form.account_type} onChange={e => f('account_type', e.target.value)}>
                    {ACCOUNT_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="nb-label">Account Code</label>
                  <input className="nb-input" placeholder="e.g. 1001" value={form.code} onChange={e => f('code', e.target.value)} />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Account Name *</label>
                <input className="nb-input" placeholder="e.g. Accounts Receivable" value={form.name} onChange={e => f('name', e.target.value)} />
                {errors.name && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{errors.name}</p>}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Sub-type</label>
                <select className="nb-select" value={form.account_subtype} onChange={e => f('account_subtype', e.target.value)}>
                  <option value="">— Select Sub-type —</option>
                  {(ACCOUNT_SUBTYPES[form.account_type] || []).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Parent Account</label>
                <select className="nb-select" value={form.parent} onChange={e => f('parent', e.target.value)}>
                  <option value="">— None (top level) —</option>
                  {accounts.filter((a: any) => a.account_type === form.account_type && a.id?.toString() !== editId?.toString())
                    .map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="nb-label">Description</label>
                <textarea className="nb-input" rows={3} placeholder="Optional description..." value={form.description} onChange={e => f('description', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={closeForm}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editId ? 'Update' : 'Add Account'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
