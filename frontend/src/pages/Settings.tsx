import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const TABS = [
  { key: 'organization', label: 'Organization', icon: '🏢' },
  { key: 'users', label: 'Users & Roles', icon: '👥' },
  { key: 'taxes', label: 'Taxes', icon: '📑' },
  { key: 'invoice_settings', label: 'Invoice Settings', icon: '📄' },
  { key: 'payment_terms', label: 'Payment Terms', icon: '📅' },
]

const GST_RATES = [
  { rate: 0, label: 'Exempt (0%)', description: 'Essential goods & services', color: '#6B7280' },
  { rate: 5, label: '5% GST', description: 'Basic necessities, some services', color: '#16A34A' },
  { rate: 12, label: '12% GST', description: 'Standard goods', color: '#0066CC' },
  { rate: 18, label: '18% GST', description: 'Most services, electronics', color: '#7C3AED' },
  { rate: 28, label: '28% GST', description: 'Luxury items, automobiles', color: '#DC2626' },
]

const DEFAULT_TERMS = ['Due on Receipt', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90']

export default function Settings() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('organization')
  const [orgForm, setOrgForm] = useState<any>(null)
  const [orgSaved, setOrgSaved] = useState(false)
  const [customTaxRate, setCustomTaxRate] = useState('')
  const [customTaxName, setCustomTaxName] = useState('')
  const [newTerm, setNewTerm] = useState('')
  const [customTerms, setCustomTerms] = useState<string[]>([])
  const [invSettings, setInvSettings] = useState<any>({
    prefix: 'INV-', next_number: 1, decimal_places: 2,
    show_tax_column: true, show_discount: true,
    default_notes: '', default_terms: '',
  })
  const logoRef = useRef<HTMLInputElement>(null)

  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const res = await api.get('/auth/organization/')
      const data = res.data
      if (!orgForm) setOrgForm({
        name: data.name || '', gstin: data.gstin || '', pan: data.pan || '',
        address: data.address || '', city: data.city || '', state: data.state || '',
        pincode: data.pincode || '', phone: data.phone || '', email: data.email || '',
        website: data.website || '', fiscal_year_start: data.fiscal_year_start || 'April',
        currency: data.currency || 'INR', timezone: data.timezone || 'Asia/Kolkata',
      })
      return data
    },
  })

  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.patch('/auth/organization/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organization'] }); setOrgSaved(true); setTimeout(() => setOrgSaved(false), 3000) },
  })

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/auth/users/').then(r => r.data),
    enabled: activeTab === 'users',
  })

  const { data: customTaxes = [] } = useQuery({
    queryKey: ['custom-taxes'],
    queryFn: () => api.get('/taxes/').then(r => r.data.results || r.data),
    enabled: activeTab === 'taxes',
  })

  const addTaxMutation = useMutation({
    mutationFn: (payload: any) => api.post('/taxes/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-taxes'] }); setCustomTaxRate(''); setCustomTaxName('') },
  })

  const deleteTaxMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/taxes/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-taxes'] }),
  })

  const f = (key: string, value: any) => setOrgForm((prev: any) => prev ? { ...prev, [key]: value } : prev)

  const INDIAN_STATES = ['Andhra Pradesh', 'Assam', 'Bihar', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal']

  return (
    <div className="fade-in" style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* Left Sidebar */}
      <div style={{ width: '220px', background: 'white', borderRight: '1px solid var(--border)', padding: '20px 0', flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ padding: '0 16px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Settings
        </div>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 16px', border: 'none', textAlign: 'left', cursor: 'pointer',
            fontSize: '13px', fontWeight: activeTab === tab.key ? '600' : '400',
            background: activeTab === tab.key ? 'var(--primary-light)' : 'none',
            color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
            borderLeft: activeTab === tab.key ? '3px solid var(--primary)' : '3px solid transparent',
          }}>
            <span style={{ fontSize: '16px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

        {/* Organization Tab */}
        {activeTab === 'organization' && (
          <div style={{ maxWidth: '720px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Organization</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your business details used on invoices and reports</p>
            </div>

            {orgLoading || !orgForm ? (
              <div className="card" style={{ padding: '24px' }}>
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <div style={{ height: '12px', background: '#F1F5F9', borderRadius: '4px', width: '25%', marginBottom: '8px' }} />
                    <div style={{ height: '38px', background: '#F8FAFC', borderRadius: '6px', width: '100%' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: '24px' }}>
                {/* Logo Upload */}
                <div style={{ marginBottom: '24px' }}>
                  <label className="nb-label">Company Logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                    <div style={{
                      width: '80px', height: '80px', borderRadius: '12px', border: '2px dashed var(--border)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', background: '#F8FAFC', overflow: 'hidden',
                    }} onClick={() => logoRef.current?.click()}>
                      {orgData?.logo ? (
                        <img src={orgData.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <span style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>Upload</span>
                        </>
                      )}
                    </div>
                    <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} />
                    <div>
                      <button className="btn-secondary btn-sm" onClick={() => logoRef.current?.click()}>Change Logo</button>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG up to 2MB. Recommended: 200×80px</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="nb-label">Company / Trade Name *</label>
                    <input className="nb-input" value={orgForm.name} onChange={e => f('name', e.target.value)} placeholder="Acme Pvt Ltd" />
                  </div>
                  <div>
                    <label className="nb-label">GSTIN</label>
                    <input className="nb-input" value={orgForm.gstin} onChange={e => f('gstin', e.target.value.toUpperCase())}
                      placeholder="27AABCU9603R1ZX" maxLength={15} style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }} />
                    {orgForm.gstin && orgForm.gstin.length !== 15 && (
                      <p style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px' }}>GSTIN must be 15 characters</p>
                    )}
                  </div>
                  <div>
                    <label className="nb-label">PAN</label>
                    <input className="nb-input" value={orgForm.pan} onChange={e => f('pan', e.target.value.toUpperCase())}
                      placeholder="AABCU9603R" maxLength={10} style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }} />
                  </div>
                  <div>
                    <label className="nb-label">Phone</label>
                    <input className="nb-input" value={orgForm.phone} onChange={e => f('phone', e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="nb-label">Email</label>
                    <input className="nb-input" type="email" value={orgForm.email} onChange={e => f('email', e.target.value)} placeholder="accounts@acme.com" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="nb-label">Street Address</label>
                    <textarea className="nb-input" rows={2} value={orgForm.address} onChange={e => f('address', e.target.value)}
                      placeholder="123, Business Park, MG Road" style={{ resize: 'vertical' }} />
                  </div>
                  <div>
                    <label className="nb-label">City</label>
                    <input className="nb-input" value={orgForm.city} onChange={e => f('city', e.target.value)} placeholder="Mumbai" />
                  </div>
                  <div>
                    <label className="nb-label">State</label>
                    <select className="nb-select" value={orgForm.state} onChange={e => f('state', e.target.value)}>
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="nb-label">PIN Code</label>
                    <input className="nb-input" value={orgForm.pincode} onChange={e => f('pincode', e.target.value)} placeholder="400001" maxLength={6} />
                  </div>
                  <div>
                    <label className="nb-label">Website</label>
                    <input className="nb-input" value={orgForm.website} onChange={e => f('website', e.target.value)} placeholder="www.acme.com" />
                  </div>
                  <div>
                    <label className="nb-label">Fiscal Year Starts</label>
                    <select className="nb-select" value={orgForm.fiscal_year_start} onChange={e => f('fiscal_year_start', e.target.value)}>
                      {['January', 'April', 'July', 'October'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="nb-label">Timezone</label>
                    <select className="nb-select" value={orgForm.timezone} onChange={e => f('timezone', e.target.value)}>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                  {orgSaved && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '13px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Saved successfully
                    </div>
                  )}
                  <button className="btn-secondary" onClick={() => setOrgForm(null)}>Discard Changes</button>
                  <button className="btn-primary" onClick={() => saveMutation.mutate(orgForm)} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div style={{ maxWidth: '720px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Users & Roles</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage team members and their access levels</p>
              </div>
              <button className="btn-primary btn-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Invite User
              </button>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(usersData || []).length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No users found</td></tr>
                  ) : (usersData || []).map((user: any) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: '700', color: 'var(--primary)',
                          }}>
                            {(user.first_name || user.username || '?').charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: '500' }}>{user.first_name} {user.last_name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '600',
                          background: user.role === 'admin' ? '#FFF7ED' : '#F1F5F9',
                          color: user.role === 'admin' ? '#EA580C' : '#64748B',
                        }}>{user.role || 'User'}</span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '600',
                          background: user.is_active ? '#F0FDF4' : '#F1F5F9',
                          color: user.is_active ? '#16A34A' : '#94A3B8',
                        }}>{user.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button className="btn-secondary btn-sm">Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Taxes Tab */}
        {activeTab === 'taxes' && (
          <div style={{ maxWidth: '720px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Tax Rates</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>GST rates used on invoices and bills</p>
            </div>

            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>Standard GST Rates</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {GST_RATES.map(tax => (
                  <div key={tax.rate} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: '#FAFAFA',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '8px', background: `${tax.color}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: '800', color: tax.color,
                      }}>{tax.rate}%</div>
                      <div>
                        <p style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{tax.label}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tax.description}</p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                      background: '#F0FDF4', color: '#16A34A', fontWeight: '600',
                    }}>Standard</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Taxes */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>Custom Tax Rates</h3>
              {(Array.isArray(customTaxes) ? customTaxes : []).map((tax: any) => (
                <div key={tax.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                  marginBottom: '8px', background: '#FAFAFA',
                }}>
                  <div>
                    <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{tax.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tax.rate}%</p>
                  </div>
                  <button className="btn-icon btn-sm" onClick={() => { if (window.confirm('Delete tax?')) deleteTaxMutation.mutate(tax.id) }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                  </button>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <input className="nb-input" placeholder="Tax name (e.g. Cess)" value={customTaxName} onChange={e => setCustomTaxName(e.target.value)} style={{ flex: 2 }} />
                <input className="nb-input" type="number" placeholder="Rate %" min="0" max="100" value={customTaxRate} onChange={e => setCustomTaxRate(e.target.value)} style={{ flex: 1 }} />
                <button className="btn-primary" onClick={() => {
                  if (!customTaxName || !customTaxRate) return
                  addTaxMutation.mutate({ name: customTaxName, rate: parseFloat(customTaxRate) })
                }} disabled={addTaxMutation.isPending}>Add</button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Settings Tab */}
        {activeTab === 'invoice_settings' && (
          <div style={{ maxWidth: '600px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Invoice Settings</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Customize invoice numbering and display</p>
            </div>
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label className="nb-label">Invoice Prefix</label>
                  <input className="nb-input" value={invSettings.prefix}
                    onChange={e => setInvSettings((s: any) => ({ ...s, prefix: e.target.value }))} placeholder="INV-" />
                </div>
                <div>
                  <label className="nb-label">Next Invoice Number</label>
                  <input className="nb-input" type="number" min="1" value={invSettings.next_number}
                    onChange={e => setInvSettings((s: any) => ({ ...s, next_number: parseInt(e.target.value) }))} />
                </div>
                <div>
                  <label className="nb-label">Decimal Places</label>
                  <select className="nb-select" value={invSettings.decimal_places}
                    onChange={e => setInvSettings((s: any) => ({ ...s, decimal_places: parseInt(e.target.value) }))}>
                    <option value={0}>0</option>
                    <option value={2}>2</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>Display Options</p>
                {[
                  { key: 'show_tax_column', label: 'Show tax breakdown column' },
                  { key: 'show_discount', label: 'Enable discount column' },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={invSettings[opt.key]}
                      onChange={e => setInvSettings((s: any) => ({ ...s, [opt.key]: e.target.checked }))} />
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{opt.label}</span>
                  </label>
                ))}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="nb-label">Default Notes</label>
                <textarea className="nb-input" rows={3} placeholder="Thank you for your business!"
                  value={invSettings.default_notes}
                  onChange={e => setInvSettings((s: any) => ({ ...s, default_notes: e.target.value }))}
                  style={{ resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="nb-label">Default Terms & Conditions</label>
                <textarea className="nb-input" rows={3} placeholder="Payment is due within 30 days..."
                  value={invSettings.default_terms}
                  onChange={e => setInvSettings((s: any) => ({ ...s, default_terms: e.target.value }))}
                  style={{ resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary">Save Invoice Settings</button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Terms Tab */}
        {activeTab === 'payment_terms' && (
          <div style={{ maxWidth: '560px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Payment Terms</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Define standard payment terms available on invoices</p>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#F8FAFC' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Standard Terms</p>
              </div>
              {[...DEFAULT_TERMS, ...customTerms].map((term, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #F8FAFC' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>{term}</span>
                  </div>
                  {i >= DEFAULT_TERMS.length && (
                    <button className="btn-icon btn-sm" onClick={() => setCustomTerms(ct => ct.filter((_, ci) => ci !== i - DEFAULT_TERMS.length))}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              ))}
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
                <input className="nb-input" placeholder="Add custom term (e.g. Net 120)" value={newTerm}
                  onChange={e => setNewTerm(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newTerm.trim()) { setCustomTerms(ct => [...ct, newTerm.trim()]); setNewTerm('') } }} />
                <button className="btn-primary" onClick={() => {
                  if (newTerm.trim()) { setCustomTerms(ct => [...ct, newTerm.trim()]); setNewTerm('') }
                }}>Add</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
