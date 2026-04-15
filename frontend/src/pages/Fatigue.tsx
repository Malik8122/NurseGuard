import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { api } from '../api'

function RiskBadge({ label }: { label: string }) {
  const map: Record<string, string> = {
    'High risk': 'badge-danger',
    'Medium':    'badge-warning',
    'Safe':      'badge-success',
  }
  return <span className={`badge ${map[label] || 'badge-neutral'}`}>{label}</span>
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  const pct = Math.min(100, (score / 10) * 100)
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)', minWidth: 56 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-[13px] font-bold tabular-nums flex-shrink-0 w-8 text-right" style={{ color }}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

export default function Fatigue() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { api.fatigue().then(d => { if (!d.error) setData(d) }).catch(() => {}) }, [])

  const nurses    = data?.nurses    || []
  const threshold = data?.threshold || 5.0

  const summaryCards = [
    { label: 'High Risk',   value: data?.high,   color: 'var(--danger)',  bg: 'var(--danger-light)',  icon: AlertTriangle },
    { label: 'Medium Risk', value: data?.medium, color: 'var(--warning)', bg: 'var(--warning-light)', icon: Clock },
    { label: 'Safe',        value: data?.safe,   color: 'var(--success)', bg: 'var(--success-light)', icon: CheckCircle },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Fatigue Monitor</h1>
          <p className="page-sub">
            Threshold: <strong>{threshold}</strong> · Scores above = high risk, 2–{threshold} = medium, below 2 = safe
          </p>
        </div>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-7">
          {summaryCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.28 }}
              className="card p-6 flex items-center gap-5"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: s.bg }}
              >
                <s.icon size={24} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-4xl font-extrabold leading-none tracking-tight" style={{ color: s.color }}>
                  {s.value ?? 0}
                </p>
                <p className="text-[13px] font-semibold mt-1.5" style={{ color: 'var(--muted)' }}>
                  {s.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Table card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.28 }}
        className="card overflow-hidden"
      >
        {/* Table header */}
        <div
          className="flex items-center gap-3 px-7 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent-light)' }}
          >
            <Activity size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="font-bold text-[15px] leading-none bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
              Nurse Fatigue Scores
            </h2>
            <p className="text-[12px] mt-1" style={{ color: 'var(--muted)' }}>
              Current scheduling period
            </p>
          </div>
          {data && (
            <div className="ml-auto flex gap-3">
              <span className="badge badge-danger">{data.high ?? 0} high</span>
              <span className="badge badge-warning">{data.medium ?? 0} medium</span>
              <span className="badge badge-success">{data.safe ?? 0} safe</span>
            </div>
          )}
        </div>

        {nurses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {['Nurse', 'Ward', 'Role', 'Consec. Days', 'Night Shifts', 'Total Hours', 'Score', 'Status']
                    .map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {nurses.map((n: any, i: number) => (
                  <motion.tr
                    key={n.nurse_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.025 }}
                  >
                    {/* Nurse */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold text-white"
                          style={{ background: `hsl(${n.name?.charCodeAt(0) * 37 % 360},55%,46%)` }}
                        >
                          {n.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-[13px] whitespace-nowrap" style={{ color: 'var(--text)' }}>
                          {n.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-[13px] font-medium whitespace-nowrap">{n.ward}</span>
                    </td>
                    <td>
                      <span className="badge badge-neutral text-[11px]">{n.role}</span>
                    </td>
                    <td>
                      <span className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>
                        {n.consecutive_days}
                        <span className="text-[11px] font-normal ml-0.5" style={{ color: 'var(--muted)' }}>d</span>
                      </span>
                    </td>
                    <td>
                      <span className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>
                        {n.night_shifts}
                        <span className="text-[11px] font-normal ml-0.5" style={{ color: 'var(--muted)' }}>shifts</span>
                      </span>
                    </td>
                    <td>
                      <span className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>
                        {n.total_hours}
                        <span className="text-[11px] font-normal ml-0.5" style={{ color: 'var(--muted)' }}>h</span>
                      </span>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <ScoreBar score={n.fatigue_score} color={n.fatigue_color} />
                    </td>
                    <td>
                      <RiskBadge label={n.fatigue_label} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'var(--border)' }}
            >
              <Clock size={26} style={{ color: 'var(--muted)' }} />
            </div>
            <p className="font-bold text-[15px] mb-2" style={{ color: 'var(--text)' }}>No fatigue data yet</p>
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
              Generate a schedule first to see fatigue analysis
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}