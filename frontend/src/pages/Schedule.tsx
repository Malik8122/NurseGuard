import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, ChevronDown, ChevronLeft, ChevronRight, Upload, AlertCircle } from 'lucide-react'
import { api } from '../api'

const DAYS       = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SHIFTS_ALL = ['Morning', 'Evening', 'Night', 'Off', 'AL']
const SHIFT_BADGE: Record<string, string> = {
  Morning: 'shift-M', Evening: 'shift-E', Night: 'shift-N', Off: 'shift-OFF', AL: 'shift-AL',
}
const SHIFT_CHAR: Record<string, string> = {
  Morning: 'M', Evening: 'E', Night: 'N', Off: 'OFF', AL: 'AL',
}

function ShiftCell({ shift, nurse, dayIdx, onAssign }: any) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`shift-pill ${SHIFT_BADGE[shift] || 'shift-OFF'}`}
        style={{ cursor: 'pointer', transition: 'transform 0.1s', minWidth: 44, textAlign: 'center' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {SHIFT_CHAR[shift] || shift}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              position: 'absolute',
              top: 32,
              zIndex: 50,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'hidden',
              minWidth: 110,
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            }}
          >
            {SHIFTS_ALL.map(s => (
              <button
                key={s}
                onClick={() => { onAssign(nurse, dayIdx, s); setOpen(false) }}
                className={`shift-pill`}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '9px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: 0,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Schedule() {
  const [data,       setData]       = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [gens,       setGens]       = useState(100)
  const [pop,        setPop]        = useState(50)
  const [days,       setDays]       = useState(14)
  const [week,       setWeek]       = useState(0)
  const [ward,       setWard]       = useState('All wards')
  const [result,     setResult]     = useState<any>(null)
  const [uploading,  setUploading]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () =>
    api.schedule(ward === 'All wards' ? undefined : ward, week)
      .then(setData)
      .catch(() => {})

  useEffect(() => { load() }, [ward, week])

  const generate = async () => {
    setGenerating(true)
    try {
      const r = await api.generate(gens, pop, days)
      setResult(r)
      load()
    } catch (e: any) { alert('Error: ' + e.message) }
    setGenerating(false)
  }

  const assign = async (nurse_id: string, dayIdx: number, shift: string) => {
    await api.assignShift(nurse_id, week * 7 + dayIdx, shift)
    load()
  }

  const uploadCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { await api.uploadNurses(file); load() } catch {}
    setUploading(false)
  }

  const rows      = data?.rows       || []
  const violations = data?.violations || []
  const numWeeks  = data?.weeks      || 1
  const wards     = ['All wards', ...(data?.wards || [])]

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Shift Schedule</h1>
          <p className="page-sub">View, edit and generate AI-optimised nurse rosters</p>
        </div>
        <div className="page-actions">
          <input ref={fileRef} type="file" accept=".csv" onChange={uploadCSV} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()} className="btn-ghost">
            <Upload size={15} />
            {uploading ? 'Uploading…' : 'Upload CSV'}
          </button>
          <button onClick={generate} disabled={generating} className="btn-primary">
            <RefreshCw size={15} style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }} />
            {generating ? 'Generating…' : 'Generate Schedule'}
          </button>
        </div>
      </div>

      {/* ── Controls strip ── */}
      <div className="control-strip">

        {/* Ward filter */}
        <div style={{ position: 'relative' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Ward</label>
          <div style={{ position: 'relative' }}>
            <select
              value={ward}
              onChange={e => setWard(e.target.value)}
              className="input"
              style={{ minWidth: 160, paddingRight: 36, appearance: 'none' }}
            >
              {wards.map(w => <option key={w}>{w}</option>)}
            </select>
            <ChevronDown size={14} style={{
              position: 'absolute', right: 12, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none',
            }} />
          </div>
        </div>

        <div className="divider" />

        {/* Week navigator */}
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Week</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <button
              onClick={() => setWeek(w => Math.max(0, w - 1))}
              style={{ padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ padding: '0 12px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
              Week {week + 1} of {numWeeks}
            </span>
            <button
              onClick={() => setWeek(w => Math.min(numWeeks - 1, w + 1))}
              style={{ padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="divider" />

        {/* GA parameters */}
        <div className="param-group">
          <label>Generations</label>
          <input type="range" min={20} max={300} step={10} value={gens} onChange={e => setGens(+e.target.value)} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', minWidth: 28 }}>{gens}</span>
        </div>

        <div className="param-group">
          <label>Population</label>
          <input type="range" min={10} max={150} step={10} value={pop} onChange={e => setPop(+e.target.value)} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', minWidth: 28 }}>{pop}</span>
        </div>

        <div className="param-group">
          <label>Days</label>
          <input type="range" min={7} max={28} step={7} value={days} onChange={e => setDays(+e.target.value)} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', minWidth: 28 }}>{days}</span>
        </div>

        {/* Legend — pushed right */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {[['M','Morning','shift-M'], ['E','Evening','shift-E'], ['N','Night','shift-N'],
            ['OFF','Off','shift-OFF'], ['AL','Leave','shift-AL']].map(([code, lbl, cls]) => (
            <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`shift-pill ${cls}`}>{code}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Generate result summary ── */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
        >
          {[
            { label: 'Avg Fatigue', value: `${result.avg_fatigue}/10`, color: 'var(--warning)' },
            { label: 'Violations',  value: result.violations,          color: 'var(--danger)'  },
            { label: 'Scheduled',   value: `${result.total_nurses} nurses`, color: 'var(--success)' },
          ].map(m => (
            <div key={m.label} className="card" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{m.label}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: m.color }}>{m.value}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Violations banner ── */}
      {violations.length > 0 && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 12,
          background: 'var(--danger-light)',
          border: '1px solid var(--danger)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--danger)' }}>
              {violations.length} constraint violations detected
            </span>
          </div>
          {violations.slice(0, 3).map((v: any, i: number) => (
            <p key={i} style={{ fontSize: '0.78rem', color: 'var(--danger)', paddingLeft: 24 }}>
              {v.nurse} — {v.issue} ({v.day})
            </p>
          ))}
        </div>
      )}

      {/* ── Schedule table ── */}
      {rows.length > 0 ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Nurse</th>
                  <th style={{ minWidth: 120 }}>Ward</th>
                  {DAYS.map(d => (
                    <th key={d} style={{ textAlign: 'center', minWidth: 60 }}>{d}</th>
                  ))}
                  <th style={{ textAlign: 'right', minWidth: 100 }}>Fatigue</th>
                  <th style={{ textAlign: 'right', minWidth: 72 }}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, ri: number) => (
                  <motion.tr
                    key={row.nurse_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: ri * 0.018 }}
                  >
                    {/* Nurse name */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: `linear-gradient(135deg, hsl(${(row.nurse_id.charCodeAt(0) * 7) % 360},70%,60%), hsl(${((row.nurse_id.charCodeAt(0) * 7) + 20) % 360},80%,45%))`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}>
                          {(row.name || '??').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>
                          {row.name}
                        </span>
                      </div>
                    </td>

                    {/* Ward */}
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{row.ward}</span>
                    </td>

                    {/* Day cells */}
                    {DAYS.map((d, di) => (
                      <td key={d} style={{ textAlign: 'center', padding: '12px 8px' }}>
                        <ShiftCell
                          shift={row.raw_shifts?.[d] || 'Off'}
                          nurse={row.nurse_id}
                          dayIdx={di}
                          onAssign={assign}
                        />
                      </td>
                    ))}

                    {/* Fatigue */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{ width: 56, height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 99,
                            width: `${Math.min(100, (row.fatigue_score / 10) * 100)}%`,
                            background: row.fatigue_color,
                          }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: row.fatigue_color, minWidth: 32, textAlign: 'right' }}>
                          {row.fatigue_score?.toFixed(1)}
                        </span>
                      </div>
                    </td>

                    {/* Hours */}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      {row.hours}h
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--border)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <RefreshCw size={26} style={{ color: 'var(--muted)' }} />
          </div>
          <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 8 }}>
            No schedule generated yet
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: 24 }}>
            Upload a nurse CSV then click <strong>Generate Schedule</strong>
          </p>
          <button onClick={generate} disabled={generating} className="btn-primary" style={{ margin: '0 auto' }}>
            <RefreshCw size={15} />
            Generate Schedule
          </button>
        </div>
      )}
    </div>
  )
}