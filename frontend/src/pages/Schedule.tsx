import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, RefreshCw, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../api'

const DAYS      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SHIFTS_ALL = ['Morning', 'Evening', 'Night', 'Off', 'AL']
const SHIFT_BADGE: Record<string, string> = {
  Morning: 'shift-M', Evening: 'shift-E', Night: 'shift-N', Off: 'shift-OFF', AL: 'shift-AL'
}
const SHIFT_CHAR: Record<string, string> = {
  Morning: 'M', Evening: 'E', Night: 'N', Off: 'OFF', AL: 'AL'
}

function ShiftCell({ shift, nurse, dayLabel, dayIdx, onAssign }: any) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative flex justify-center">
      <button onClick={() => setOpen(o => !o)}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold min-w-[44px] text-center transition-transform hover:scale-105 ${SHIFT_BADGE[shift] || 'shift-OFF'}`}>
        {SHIFT_CHAR[shift] || shift}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 top-8 rounded-xl shadow-xl border overflow-hidden"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', minWidth: 100 }}>
            {SHIFTS_ALL.map(s => (
              <button key={s} onClick={() => { onAssign(nurse, dayIdx, s); setOpen(false) }}
                className={`block w-full px-4 py-2 text-xs text-left font-medium hover:opacity-80 ${SHIFT_BADGE[s]}`}>
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

  const load = () => api.schedule(ward === 'All wards' ? undefined : ward, week).then(setData).catch(() => {})
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

  const rows     = data?.rows      || []
  const violations = data?.violations || []
  const numWeeks = data?.weeks || 1
  const wards    = ['All wards', ...(data?.wards || [])]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Shift schedule</h1>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
          {new Date().toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })}
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border p-5 mb-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-end gap-4">
          {/* Ward filter */}
          <div className="relative">
            <select value={ward} onChange={e => setWard(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
              {wards.map(w => <option key={w}>{w}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--muted)' }} />
          </div>

          {/* Week selector */}
          <div className="flex items-center gap-1 border rounded-lg overflow-hidden"
            style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setWeek(w => Math.max(0, w - 1))}
              className="px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700"
              style={{ color: 'var(--muted)' }}>
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm" style={{ color: 'var(--text)' }}>Week {week + 1}</span>
            <button onClick={() => setWeek(w => Math.min(numWeeks - 1, w + 1))}
              className="px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700"
              style={{ color: 'var(--muted)' }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Upload CSV */}
          <input ref={fileRef} type="file" accept=".csv" onChange={uploadCSV} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-emerald-50"
            style={{ borderColor: '#10B981', color: '#10B981' }}>
            {uploading ? 'Uploading...' : 'Upload new CSV'}
          </button>

          {/* Generate */}
          <button onClick={generate} disabled={generating}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-60">
            <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating...' : 'Download schedule'}
          </button>

          {/* GA params */}
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              Gens: <strong style={{ color: 'var(--text)' }}>{gens}</strong>
            </span>
            <input type="range" min={20} max={300} step={10} value={gens} onChange={e => setGens(+e.target.value)}
              className="w-24" style={{ accentColor: '#10B981' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              Pop: <strong style={{ color: 'var(--text)' }}>{pop}</strong>
            </span>
            <input type="range" min={10} max={150} step={10} value={pop} onChange={e => setPop(+e.target.value)}
              className="w-24" style={{ accentColor: '#10B981' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              Days: <strong style={{ color: 'var(--text)' }}>{days}</strong>
            </span>
            <input type="range" min={7} max={28} step={7} value={days} onChange={e => setDays(+e.target.value)}
              className="w-20" style={{ accentColor: '#10B981' }} />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {[['M','Morning','shift-M'], ['E','Evening','shift-E'], ['N','Night','shift-N'],
            ['—','Off','shift-OFF'], ['AL','Leave','shift-AL']].map(([code, label, cls]) => (
            <div key={code} className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{code}</span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Result summary */}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex gap-4 mb-4">
          {[
            { label: 'Avg fatigue', value: `${result.avg_fatigue}/10`, color: '#F59E0B' },
            { label: 'Violations',  value: result.violations,          color: '#EF4444' },
            { label: 'Scheduled',   value: result.total_nurses,        color: '#10B981' },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--muted)' }}>{m.label}:</span>
              <strong style={{ color: m.color }}>{m.value}</strong>
            </div>
          ))}
        </motion.div>
      )}

      {/* Violations */}
      {violations.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 p-4">
          <p className="text-sm font-semibold text-red-600 mb-2">{violations.length} constraint violations</p>
          {violations.slice(0, 3).map((v: any, i: number) => (
            <p key={i} className="text-xs text-red-500">{v.nurse} — {v.issue} ({v.day})</p>
          ))}
        </div>
      )}

      {/* Schedule table */}
      {rows.length > 0 ? (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: `1px solid var(--border)` }}>
                  <th className="px-4 py-3 text-left font-semibold w-36" style={{ color: 'var(--text)' }}>Nurse</th>
                  <th className="px-4 py-3 text-left font-semibold w-28" style={{ color: 'var(--muted)' }}>Ward</th>
                  {DAYS.map(d => (
                    <th key={d} className="px-3 py-3 text-center font-semibold" style={{ color: 'var(--muted)' }}>
                      {d}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--muted)' }}>Fatigue</th>
                  <th className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--muted)' }}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, ri: number) => (
                  <motion.tr key={row.nurse_id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ri * 0.02 }}
                    style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--bg)',
                             borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: `hsl(${row.nurse_id.charCodeAt(0)*7 % 360},60%,50%)` }}>
                          {(row.name || '??').split(' ').map((w: string) => w[0]).join('').slice(0,2)}
                        </div>
                        <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{row.ward}</td>
                    {DAYS.map((d, di) => (
                      <td key={d} className="px-2 py-3 text-center">
                        <ShiftCell
                          shift={row.raw_shifts?.[d] || 'Off'}
                          nurse={row.nurse_id}
                          dayLabel={d}
                          dayIdx={di}
                          onAssign={assign}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${Math.min(100, (row.fatigue_score / 10) * 100)}%`,
                                     background: row.fatigue_color }} />
                        </div>
                        <span className="text-xs font-semibold w-8 text-right" style={{ color: row.fatigue_color }}>
                          {row.fatigue_score?.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {row.hours}h
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border p-16 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <RefreshCw size={40} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No schedule yet</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Upload a nurse CSV and click generate</p>
        </div>
      )}
    </div>
  )
}