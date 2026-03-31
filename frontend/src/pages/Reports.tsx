import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

const fmt = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`
const today = new Date().toISOString().split('T')[0]
const firstOfYear = `${new Date().getFullYear()}-04-01`

const REPORT_CATEGORIES = [
  {
    label: 'Sales Reports', reports: [
      { key: 'profit_loss', label: 'Profit & Loss', icon: '📊' },
      { key: 'sales_summary', label: 'Sales Summary', icon: '📈' },
      { key: 'customer_balances', label: 'Customer Balances', icon: '👤' },
      { key: 'receivables_aging', label: 'Receivables Aging', icon: '⏰' },
    ]
  },
  {
    label: 'Purchase Reports', reports: [
      { key: 'purchase_summary', label: 'Purchase Summary', icon: '🛒' },
      { key: 'vendor_balances', label: 'Vendor Balances', icon: '🏭' },
      { key: 'payables_aging', label: 'Payables Aging', icon: '⏱' },
    ]
  },
  {
    label: 'Accountant', reports: [
      { key: 'balance_sheet', label: 'Balance Sheet', icon: '⚖' },
      { key: 'trial_balance', label: 'Trial Balance', icon: '📋' },
      { key: 'cash_flow', label: 'Cash Flow', icon: '💸' },
    ]
  },
  {
    label: 'GST Reports', reports: [
      { key: 'gst_summary', label: 'GST Summary', icon: '📑' },
      { key: 'gstr1', label: 'GSTR-1', icon: '📤' },
      { key: 'gstr3b', label: 'GSTR-3B', icon: '📥' },
    ]
  },
]

function ProfitLossReport({ data, loading }: { data: any; loading: boolean }) {
  const Skel = ({ w = '60%' }: { w?: string }) => (
    <div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: w }} />
  )

  const revenue = data?.revenue || []
  const expenses = data?.expenses || []
  const totalRevenue = revenue.reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0)
  const totalExpenses = expenses.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0)
  const netProfit = totalRevenue - totalExpenses
  const grossProfit = data?.gross_profit ?? (totalRevenue - totalExpenses)

  const Section = ({ title, items, total, color }: { title: string; items: any[]; total: number; color: string }) => (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
        <span style={{ fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color }}>{title}</span>
        <span style={{ fontWeight: '700', fontSize: '13px', color }}>{fmt(total)}</span>
      </div>
      {loading ? Array(4).fill(0).map((_, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 24px', borderBottom: '1px solid #F8FAFC' }}>
          <Skel w={`${35 + i * 10}%`} /><Skel w="15%" />
        </div>
      )) : items.map((item: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', borderBottom: '1px solid #F8FAFC' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.name}</span>
          <span style={{ fontSize: '13px', fontWeight: '500' }}>{fmt(item.amount)}</span>
        </div>
      ))}
      {!loading && items.length === 0 && (
        <div style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>No data for selected period.</div>
      )}
    </div>
  )

  return (
    <div>
      <Section title="Revenue" items={revenue} total={totalRevenue} color="var(--success)" />
      <Section title="Expenses" items={expenses} total={totalExpenses} color="var(--danger)" />

      <div style={{ padding: '16px 20px', background: netProfit >= 0 ? '#F0FDF4' : '#FEF2F2', borderRadius: '8px', border: `1px solid ${netProfit >= 0 ? '#BBF7D0' : '#FECACA'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Net Profit / (Loss)</span>
          <span style={{ fontSize: '20px', fontWeight: '800', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {netProfit < 0 ? `(${fmt(Math.abs(netProfit))})` : fmt(netProfit)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Gross Profit: <strong style={{ color: 'var(--text-primary)' }}>{fmt(grossProfit)}</strong>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Net Margin: <strong style={{ color: totalRevenue > 0 ? (netProfit >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--text-primary)' }}>
              {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : '—'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReceivablesAging({ data, loading }: { data: any; loading: boolean }) {
  const aging = data?.aging_buckets || []
  const BUCKETS = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days']

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="nb-table">
        <thead>
          <tr>
            <th>Customer</th>
            {BUCKETS.map(b => <th key={b} style={{ textAlign: 'right' }}>{b}</th>)}
            <th style={{ textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {loading ? Array(6).fill(0).map((_, i) => (
            <tr key={i}>{Array(7).fill(0).map((_, j) => (
              <td key={j}><div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: '65%' }} /></td>
            ))}</tr>
          )) : aging.length === 0 ? (
            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No outstanding receivables.</td></tr>
          ) : aging.map((row: any, i: number) => (
            <tr key={i}>
              <td style={{ fontWeight: '500' }}>{row.customer}</td>
              {BUCKETS.map((b, j) => (
                <td key={b} style={{ textAlign: 'right', color: j === 0 ? 'var(--text-primary)' : j < 2 ? 'var(--warning)' : 'var(--danger)', fontWeight: row[b] > 0 ? '500' : '400' }}>
                  {row[b] > 0 ? fmt(row[b]) : '—'}
                </td>
              ))}
              <td style={{ textAlign: 'right', fontWeight: '700' }}>{fmt(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GSTReport({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.gst_rows || []
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="nb-table">
        <thead>
          <tr>
            <th>GST Rate</th>
            <th style={{ textAlign: 'right' }}>Taxable Amount</th>
            <th style={{ textAlign: 'right' }}>CGST</th>
            <th style={{ textAlign: 'right' }}>SGST</th>
            <th style={{ textAlign: 'right' }}>IGST</th>
            <th style={{ textAlign: 'right' }}>Total Tax</th>
          </tr>
        </thead>
        <tbody>
          {loading ? Array(5).fill(0).map((_, i) => (
            <tr key={i}>{Array(6).fill(0).map((_, j) => (
              <td key={j}><div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: '65%' }} /></td>
            ))}</tr>
          )) : rows.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No GST data for this period.</td></tr>
          ) : rows.map((row: any, i: number) => (
            <tr key={i}>
              <td style={{ fontWeight: '600' }}>{row.rate}%</td>
              <td style={{ textAlign: 'right' }}>{fmt(row.taxable_amount)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(row.cgst)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(row.sgst)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(row.igst)}</td>
              <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--primary)' }}>{fmt(row.total_tax)}</td>
            </tr>
          ))}
          {rows.length > 0 && (
            <tr style={{ background: '#F8FAFC', borderTop: '2px solid var(--border)' }}>
              <td style={{ fontWeight: '700', padding: '10px 16px' }}>Total</td>
              {['taxable_amount', 'cgst', 'sgst', 'igst', 'total_tax'].map(k => (
                <td key={k} style={{ textAlign: 'right', fontWeight: '700', padding: '10px 16px' }}>
                  {fmt(rows.reduce((s: number, r: any) => s + parseFloat(r[k] || 0), 0))}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('profit_loss')
  const [dateFrom, setDateFrom] = useState(firstOfYear)
  const [dateTo, setDateTo] = useState(today)

  const { data, isLoading } = useQuery({
    queryKey: ['report', selectedReport, dateFrom, dateTo],
    queryFn: () => api.get('/reports/', { params: { type: selectedReport, date_from: dateFrom, date_to: dateTo } }).then(r => r.data),
  })

  const selectedLabel = REPORT_CATEGORIES.flatMap(c => c.reports).find(r => r.key === selectedReport)?.label || 'Report'

  const handleExportCSV = () => {
    const url = `/api/v1/reports/export/?type=${selectedReport}&format=csv&date_from=${dateFrom}&date_to=${dateTo}`
    window.open(url, '_blank')
  }

  const handleExportPDF = () => {
    const url = `/api/v1/reports/export/?type=${selectedReport}&format=pdf&date_from=${dateFrom}&date_to=${dateTo}`
    window.open(url, '_blank')
  }

  return (
    <div className="fade-in" style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* Left Sidebar */}
      <div style={{
        width: '220px', background: 'white', borderRight: '1px solid var(--border)',
        overflowY: 'auto', flexShrink: 0, padding: '16px 0',
      }}>
        <div style={{ padding: '8px 16px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Reports
        </div>
        {REPORT_CATEGORIES.map(cat => (
          <div key={cat.label} style={{ marginBottom: '8px' }}>
            <div style={{ padding: '6px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {cat.label}
            </div>
            {cat.reports.map(report => (
              <button key={report.key} onClick={() => setSelectedReport(report.key)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', border: 'none', textAlign: 'left', cursor: 'pointer',
                fontSize: '13px', fontWeight: selectedReport === report.key ? '600' : '400',
                background: selectedReport === report.key ? 'var(--primary-light)' : 'none',
                color: selectedReport === report.key ? 'var(--primary)' : 'var(--text-secondary)',
                borderRadius: '0',
              }}>
                <span style={{ fontSize: '14px' }}>{report.icon}</span>
                {report.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedLabel}</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {new Date(dateFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' — '}
              {new Date(dateTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="date" className="nb-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '150px' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>to</span>
            <input type="date" className="nb-input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '150px' }} />
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { label: 'This Month', from: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-01`, to: today },
                { label: 'This Quarter', from: firstOfYear, to: today },
                { label: 'This Year', from: firstOfYear, to: today },
              ].map(preset => (
                <button key={preset.label} className="btn-secondary btn-sm"
                  onClick={() => { setDateFrom(preset.from); setDateTo(preset.to) }}>
                  {preset.label}
                </button>
              ))}
            </div>
            <button className="btn-secondary btn-sm" onClick={handleExportCSV}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
            <button className="btn-secondary btn-sm" onClick={handleExportPDF}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              PDF
            </button>
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          {selectedReport === 'profit_loss' && (
            <ProfitLossReport data={data} loading={isLoading} />
          )}
          {selectedReport === 'receivables_aging' && (
            <ReceivablesAging data={data} loading={isLoading} />
          )}
          {(selectedReport === 'gst_summary' || selectedReport === 'gstr1' || selectedReport === 'gstr3b') && (
            <GSTReport data={data} loading={isLoading} />
          )}
          {!['profit_loss', 'receivables_aging', 'gst_summary', 'gstr1', 'gstr3b'].includes(selectedReport) && (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              {isLoading ? (
                <div>
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F8FAFC' }}>
                      <div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: `${30 + i * 8}%` }} />
                      <div style={{ height: '14px', background: '#F1F5F9', borderRadius: '4px', width: '15%' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>
                    {REPORT_CATEGORIES.flatMap(c => c.reports).find(r => r.key === selectedReport)?.icon || '📊'}
                  </div>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>{selectedLabel}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {data ? 'No data for selected period.' : 'Select a date range and generate the report.'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
