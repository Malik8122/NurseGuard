import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Calendar, AlertTriangle, AlertCircle, CheckCircle, Info, TrendingUp, Clock } from 'lucide-react'
import { api } from '../api'

function StatCard({ icon: Icon, iconColor, iconBg, label, value, sub, subOk, delay = 0 }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="card p-6 flex flex-col justify-between"
    >
      <div className="flex items-start justify-between mb-5">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
        {sub !== undefined && (
          <span className={`badge text-[11px] mt-0.5 ${subOk ? 'badge-success' : value > 0 ? 'badge-danger' : 'badge-neutral'}`}>
            {sub}
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>
          {label}
        </p>
        <p className="text-4xl font-black leading-none tracking-tighter" style={{ color: 'var(--text)' }}>
          {value ?? '—'}
        </p>
      </div>
    </motion.div>
  )
}

function CoverageBar({ label, actual, required, color, delay = 0 }: any) {
  const pct = Math.min(100, Math.round((actual / Math.max(required, 1)) * 100))
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-soft)' }}>{label}</span>
        <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--text)' }}>
          {actual}
          <span className="font-normal" style={{ color: 'var(--muted)' }}>/{required}</span>
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden shadow-inner" style={{ background: 'var(--border)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <p className="text-[11px] mt-1.5 text-right font-medium" style={{ color: 'var(--muted)' }}>{pct}%</p>
    </div>
  )
}

function AlertRow({ alert, i }: { alert: any; i: number }) {
  const icons: any  = { danger: AlertCircle, warning: AlertTriangle, info: Info, success: CheckCircle }
  const colors: any = { danger: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)', success: 'var(--success)' }
  const bgs: any    = { danger: 'var(--danger-light)', warning: 'var(--warning-light)', info: 'var(--info-light)', success: 'var(--success-light)' }
  const Icon  = icons[alert.type]  || Info
  const color = colors[alert.type] || 'var(--info)'
  const bg    = bgs[alert.type]    || 'var(--info-light)'

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.06 }}
      className="flex items-start gap-3 py-3 border-b last:border-b-0"
      style={{ borderColor: 'var(--border-light)' }}
    >
      <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: bg }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium leading-snug" style={{ color: 'var(--text)' }}>
          {alert.message}
        </p>
        <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
          {alert.detail || 'System'} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {alert.action && (
        <button
          className="text-[11px] font-bold flex-shrink-0 px-3 py-1.5 rounded-lg"
          style={{ color, background: bg }}
        >
          {alert.action}
        </button>
      )}
    </motion.div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { api.dashboard().then(setData).catch(() => {}) }, [])

  const cov = data?.shift_coverage || {}
  const coverageItems = [
    { label: 'Morning', color: '#3b82f6', actual: cov.Morning?.actual ?? 0, required: cov.Morning?.required ?? 8 },
    { label: 'Evening', color: '#f59e0b', actual: cov.Evening?.actual ?? 0, required: cov.Evening?.required ?? 6 },
    { label: 'Night',   color: '#8b5cf6', actual: cov.Night?.actual   ?? 0, required: cov.Night?.required   ?? 5 },
    { label: 'ICU',     color: '#10b981', actual: cov.ICU?.actual     ?? 0, required: cov.ICU?.required     ?? 8 },
  ]

  return (
    <div className="page" style={{ paddingBottom: '32px' }}>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-7">
        <StatCard delay={0.0} icon={Users}         iconColor="text-indigo-600"   iconBg="bg-indigo-50"
          label="Total Nurses"    value={data?.total_nurses ?? 0}
          sub={data?.total_nurses ? `${data.on_duty ?? 0} on duty` : 'No data'}
          subOk={!!data?.total_nurses} />
        <StatCard delay={0.06} icon={Calendar}     iconColor="text-purple-600" iconBg="bg-purple-50"
          label="Shifts / Week"  value={data?.shifts_week ?? 0}
          sub={data?.coverage_pct != null ? `${data.coverage_pct}% covered` : undefined}
          subOk={data?.coverage_pct >= 80} />
        <StatCard delay={0.12} icon={AlertTriangle} iconColor="text-amber-500" iconBg="bg-amber-50"
          label="High Fatigue"   value={data?.high_fatigue ?? 0}
          sub={data?.high_fatigue > 0 ? 'Needs review' : 'All clear'}
          subOk={!data?.high_fatigue} />
        <StatCard delay={0.18} icon={AlertCircle}  iconColor="text-red-500"   iconBg="bg-red-50"
          label="Open Shifts"   value={data?.open_shifts ?? 0}
          sub={data?.open_shifts > 0 ? 'Understaffed' : 'Fully covered'}
          subOk={!data?.open_shifts} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Shift coverage */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-[16px] leading-none bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                Today's Coverage
              </h2>
              <p className="text-[13px] mt-1.5 font-medium" style={{ color: 'var(--muted)' }}>
                Shift staffing levels
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--border)' }}>
              <TrendingUp size={16} style={{ color: 'var(--muted)' }} />
            </div>
          </div>
          {coverageItems.map((c, i) => (
            <CoverageBar key={c.label} {...c} delay={0.3 + i * 0.08} />
          ))}
        </motion.div>

        {/* Staff status */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-[16px] leading-none bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                Staff Status
              </h2>
              <p className="text-[13px] mt-1.5 font-medium" style={{ color: 'var(--muted)' }}>
                Today's breakdown
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--border)' }}>
              <Clock size={16} style={{ color: 'var(--muted)' }} />
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'On Duty',  value: data?.on_duty  ?? 0, color: 'var(--success)', bg: 'var(--success-light)' },
              { label: 'On Leave', value: data?.on_leave ?? 0, color: 'var(--warning)', bg: 'var(--warning-light)' },
              { label: 'Day Off',  value: data?.day_off  ?? 0, color: 'var(--muted)',   bg: 'var(--border)'        },
            ].map(s => (
              <div
                key={s.label}
                className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                style={{ background: s.bg }}
              >
                <span className="text-[13px] font-semibold" style={{ color: s.color }}>{s.label}</span>
                <span className="text-2xl font-extrabold tabular-nums" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[12px] mt-5 pt-4 text-center border-t font-medium" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
            Total registered: <strong className="text-[13px]" style={{ color: 'var(--text)' }}>{data?.total_nurses ?? 0}</strong>
          </p>
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.30, duration: 0.3 }}
          className="card p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-[16px] leading-none bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                Active Alerts
              </h2>
              <p className="text-[13px] mt-1.5 font-medium" style={{ color: 'var(--muted)' }}>Requires attention</p>
            </div>
            {data?.alerts?.filter((a: any) => a.type === 'danger').length > 0 && (
              <span className="badge badge-danger">
                {data.alerts.filter((a: any) => a.type === 'danger').length} critical
              </span>
            )}
          </div>

          {data?.alerts?.length > 0 ? (
            <div className="overflow-y-auto flex-1 pr-2" style={{ maxHeight: 340 }}>
              {data.alerts.map((alert: any, i: number) => (
                <AlertRow key={i} alert={alert} i={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'var(--success-light)' }}
              >
                <CheckCircle size={28} className="text-indigo-500" />
              </div>
              <p className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>All clear</p>
              <p className="text-[13px] mt-1.5 font-medium" style={{ color: 'var(--muted)' }}>No active alerts right now</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}