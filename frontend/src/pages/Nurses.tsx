import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, ChevronDown, Plus, Upload, Users } from 'lucide-react'
import { api } from '../api'

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = name.charCodeAt(0) * 37 % 360
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg"
      style={{ 
        width: size, 
        height: size, 
        fontSize: size * 0.35, 
        background: `linear-gradient(135deg, hsl(${hue},70%,60%), hsl(${hue + 20},80%,45%))` 
      }}
    >
      {initials}
    </div>
  )
}

function FatiguePill({ label }: { label: string }) {
  const map: Record<string, string> = {
    'High risk': 'badge-danger',
    'Medium':    'badge-warning',
    'Safe':      'badge-success',
  }
  const nice =
    label === 'High risk' ? 'High fatigue' :
    label === 'Medium'    ? 'Medium' :
    'Low fatigue'
  return <span className={`badge ${map[label] || 'badge-neutral'}`}>{nice}</span>
}

function StatItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="text-[14px] font-bold leading-tight" style={{ color: accent || 'var(--text)' }}>
        {value}
      </p>
    </div>
  )
}

function NurseCard({ nurse, i }: { nurse: any; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.025, 0.5), duration: 0.25 }}
      whileHover={{ y: -3, boxShadow: '0 10px 32px rgba(0,0,0,0.10)' }}
      className="card p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={nurse.name || 'NN'} size={44} />
          <div className="min-w-0">
            <h3 className="font-bold text-[15px] leading-tight truncate" style={{ color: 'var(--text)' }}>
              {nurse.name}
            </h3>
            <p className="text-[12px] mt-1 truncate font-medium" style={{ color: 'var(--muted)' }}>
              {nurse.role} <span className="opacity-50 mx-1">•</span> {nurse.department || nurse.ward || '—'}
            </p>
          </div>
        </div>
        <FatiguePill label={nurse.fatigue_label || 'Safe'} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-light)' }} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <StatItem label="Max hrs/wk"    value={`${nurse.max_hours_per_week || 0}h`} />
        <StatItem label="Pref. shift"   value={nurse.shift_preference || '—'} />
        <StatItem label="Max consec."   value={`${nurse.max_consecutive_shifts || 5}d`} />
        <StatItem
          label="Fatigue"
          value={(nurse.fatigue_score || 0).toFixed(1)}
          accent={nurse.fatigue_color}
        />
      </div>
    </motion.div>
  )
}

export default function Nurses() {
  const [nurses,  setNurses]  = useState<any[]>([])
  const [ward,    setWard]    = useState('All wards')
  const [search,  setSearch]  = useState('')
  const [wards,   setWards]   = useState<string[]>(['All wards'])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const d = await api.nurses(ward === 'All wards' ? undefined : ward, search || undefined)
    setNurses(d.nurses || [])
    if (d.wards) setWards(['All wards', ...d.wards])
  }

  useEffect(() => { load() }, [ward, search])

  const uploadCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try { await api.uploadNurses(file); load() } catch {}
    setLoading(false)
  }

  return (
    <div className="page">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Nurse Management</h1>
          <p className="page-sub">
            {nurses.length} nurse{nurses.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="page-actions">
          <input ref={fileRef} type="file" accept=".csv" onChange={uploadCSV} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-ghost">
            <Upload size={15} />
            {loading ? 'Uploading…' : 'Import CSV'}
          </button>
          <button className="btn-primary">
            <Plus size={15} />
            Add nurse
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="flex gap-3 mb-7 items-center p-4 rounded-2xl flex-wrap"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Search input */}
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="input"
            style={{ paddingLeft: 42 }}
          />
        </div>

        {/* Ward dropdown */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <select
            value={ward}
            onChange={e => setWard(e.target.value)}
            className="input appearance-none"
            style={{ minWidth: 170, paddingRight: 36 }}
          >
            {wards.map(w => <option key={w}>{w}</option>)}
          </select>
          <ChevronDown
            size={14}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Cards grid */}
      {nurses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {nurses.map((n, i) => (
            <NurseCard key={n.nurse_id} nurse={n} i={i} />
          ))}
        </div>
      ) : (
        <div className="card p-20 text-center">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--border)' }}
          >
            <Users size={28} style={{ color: 'var(--muted)' }} />
          </div>
          <p className="font-bold text-[15px] mb-2" style={{ color: 'var(--text)' }}>
            No nurses loaded
          </p>
          <p className="text-[13px] mb-6" style={{ color: 'var(--muted)' }}>
            Upload a CSV file to load your nursing staff
          </p>
          <button onClick={() => fileRef.current?.click()} className="btn-primary mx-auto">
            <Upload size={15} /> Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={uploadCSV} className="hidden" />
        </div>
      )}
    </div>
  )
}