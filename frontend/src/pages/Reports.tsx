import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Clock, Calendar, AlertTriangle, TrendingUp, Download } from 'lucide-react'
import { api } from '../api'

const REPORT_CARDS = [
  {
    icon: Users,         iconBg: 'bg-emerald-50 text-emerald-600',
    title: 'Monthly staff report',
    desc:  'Hours, shifts, overtime per nurse',
    key:   'staff',
  },
  {
    icon: Clock,         iconBg: 'bg-amber-50 text-amber-600',
    title: 'Fatigue analysis',
    desc:  'EA penalty scores, risk levels',
    key:   'fatigue',
  },
  {
    icon: Calendar,      iconBg: 'bg-blue-50 text-blue-600',
    title: 'Coverage compliance',
    desc:  'Shift requirements vs actual',
    key:   'coverage',
  },
  {
    icon: AlertTriangle, iconBg: 'bg-red-50 text-red-500',
    title: 'Constraint violations',
    desc:  'Hard/soft constraint breaches',
    key:   'violations',
  },
  {
    icon: TrendingUp,    iconBg: 'bg-purple-50 text-purple-600',
    title: 'EA performance',
    desc:  'Convergence and optimisation stats',
    key:   'ea',
  },
  {
    icon: Download,      iconBg: 'bg-emerald-50 text-emerald-600',
    title: 'Export all data',
    desc:  'Download CSV, PDF, or Excel',
    key:   'export',
  },
]

function SummaryCard({ label, value, color }: any) {
  return (
    <div className="rounded-2xl border px-5 py-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || 'var(--text)' }}>{value ?? '—'}</p>
    </div>
  )
}

export default function Reports() {
  const [data,    setData]    = useState<any>(null)
  const [active,  setActive]  = useState<string | null>(null)

  useEffect(() => { api.reports().then(setData).catch(() => {}) }, [])

  const exportCSV = () => {
    if (!data?.rows) return
    const cols = ['name','ward','role','total_hours','night_shifts','overtime','fatigue_score','fatigue_label','violations']
    const header = cols.join(',')
    const rows   = data.rows.map((r: any) => cols.map(c => r[c] ?? '').join(','))
    const blob   = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a      = document.createElement('a')
    a.href       = URL.createObjectURL(blob)
    a.download   = 'nurseguard_report.csv'
    a.click()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Reports & analytics</h1>
      </div>

      {/* Summary row */}
      {data && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <SummaryCard label="Total hours"    value={`${data.total_hours}h`} />
          <SummaryCard label="Avg fatigue"    value={data.avg_fatigue?.toFixed(1)} color="#F59E0B" />
          <SummaryCard label="High risk"      value={data.high_risk}          color="#EF4444" />
          <SummaryCard label="Violations"     value={data.violations}         color="#EF4444" />
        </div>
      )}

      {/* Report cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {REPORT_CARDS.map((card, i) => (
          <motion.button key={card.key}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
            onClick={() => { if (card.key === 'export') exportCSV(); else setActive(active === card.key ? null : card.key) }}
            className={`text-left rounded-2xl border p-6 transition-all
              ${active === card.key ? 'border-emerald-500 ring-2 ring-emerald-100' : ''}`}
            style={{ background: 'var(--surface)', borderColor: active === card.key ? '#10B981' : 'var(--border)' }}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.iconBg}`}>
              <card.icon size={22} />
            </div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{card.title}</h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{card.desc}</p>
          </motion.button>
        ))}
      </div>

      {/* Staff report table */}
      {active === 'staff' && data?.rows && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Monthly staff report</h2>
            <button onClick={exportCSV}
              className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              <Download size={15} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: `1px solid var(--border)` }}>
                  {['Nurse','Ward','Role','Total Hours','Night Shifts','Overtime','Fatigue','Status','Violations'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r: any, i: number) => (
                  <tr key={r.nurse_id} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)',
                    borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>{r.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{r.ward}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{r.role}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text)' }}>{r.total_hours}h</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{r.night_shifts}</td>
                    <td className="px-4 py-3" style={{ color: r.overtime > 0 ? '#EF4444' : 'var(--muted)' }}>
                      {r.overtime > 0 ? `+${r.overtime}h` : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: r.fatigue_score >= 5 ? '#EF4444' : r.fatigue_score >= 2 ? '#F59E0B' : '#10B981' }}>
                      {r.fatigue_score?.toFixed(1)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                        ${r.fatigue_label === 'High risk' ? 'bg-red-100 text-red-600' :
                          r.fatigue_label === 'Medium'    ? 'bg-amber-100 text-amber-600' :
                                                            'bg-emerald-100 text-emerald-600'}`}>
                        {r.fatigue_label}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: r.violations > 0 ? '#EF4444' : 'var(--muted)' }}>
                      {r.violations || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  )
}