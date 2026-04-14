import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Save, CheckCircle } from 'lucide-react'
import { api } from '../api'

function Field({ label, desc, type = 'number', value, onChange }: any) {
  return (
    <div className="flex items-center justify-between py-4 border-b"
      style={{ borderColor: 'var(--border)' }}>
      <div>
        <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{label}</p>
        {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{desc}</p>}
      </div>
      {type === 'checkbox' ? (
        <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 accent-emerald-600" />
      ) : (
        <input type={type} value={value} onChange={e => onChange(type === 'number' ? +e.target.value : e.target.value)}
          className="w-28 px-3 py-2 rounded-lg border text-sm outline-none text-right"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
      )}
    </div>
  )
}

function InputPair({ label1, label2, val1, val2, set1, set2 }: any) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      {[{ label: label1, val: val1, set: set1 }, { label: label2, val: val2, set: set2 }].map(f => (
        <div key={f.label}>
          <label className="block text-sm mb-1.5" style={{ color: 'var(--muted)' }}>{f.label}</label>
          <input type="number" value={f.val} onChange={e => f.set(+e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
        </div>
      ))}
    </div>
  )
}

export default function Settings() {
  const [s,       setS]       = useState<any>(null)
  const [saved,   setSaved]   = useState(false)
  const [model,   setModel]   = useState<any>(null)

  useEffect(() => {
    api.settings().then(setS).catch(() => {})
    api.modelStatus().then(setModel).catch(() => {})
  }, [])

  const save = async () => {
    await api.saveSettings(s)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!s) return <div className="p-6 text-sm" style={{ color: 'var(--muted)' }}>Loading settings…</div>

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Settings</h1>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={save}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white
            ${saved ? 'bg-emerald-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
          {saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save settings'}
        </motion.button>
      </div>

      {/* EA Algorithm params */}
      <div className="rounded-2xl border p-6 mb-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="font-semibold mb-5" style={{ color: 'var(--text)' }}>EA algorithm parameters</h2>
        <InputPair
          label1="Population size"    val1={s.pop_size}       set1={(v: number) => setS({ ...s, pop_size: v })}
          label2="Generations"        val2={s.generations}    set2={(v: number) => setS({ ...s, generations: v })} />
        <InputPair
          label1="Max consecutive shifts" val1={s.max_consecutive} set1={(v: number) => setS({ ...s, max_consecutive: v })}
          label2="Min rest hours"         val2={s.min_rest_hours}  set2={(v: number) => setS({ ...s, min_rest_hours: v })} />
        <InputPair
          label1="Fatigue weight (W2)" val1={s.fatigue_weight}  set1={(v: number) => setS({ ...s, fatigue_weight: v })}
          label2="Coverage weight (W1)" val2={s.coverage_weight} set2={(v: number) => setS({ ...s, coverage_weight: v })} />
      </div>

      {/* Hospital configuration */}
      <div className="rounded-2xl border p-6 mb-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Hospital configuration</h2>
        <Field label="Fatigue alert threshold"
          desc="Send alert when score exceeds this value"
          value={s.fatigue_threshold}
          onChange={(v: number) => setS({ ...s, fatigue_threshold: v })} />
        <Field label="Auto-approve schedules"
          desc="Skip manual approval if penalty < 500"
          type="checkbox"
          value={s.auto_approve}
          onChange={(v: boolean) => setS({ ...s, auto_approve: v })} />
        <Field label="Night shift bonus fatigue"
          desc="Multiply fatigue score for night shifts"
          value={s.night_bonus}
          onChange={(v: number) => setS({ ...s, night_bonus: v })} />
      </div>

      {/* Model info */}
      {model && (
        <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>ML model status</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Status',          value: model.ready ? '✅ Ready' : '❌ Not loaded', color: model.ready ? '#10B981' : '#EF4444' },
              { label: 'MAE',             value: model.mae   ? model.mae.toFixed(3)  : '—' },
              { label: 'R² score',        value: model.r2    ? model.r2.toFixed(3)   : '—' },
              { label: 'Training samples',value: model.samples ? model.samples.toLocaleString() : '—' },
            ].map(m => (
              <div key={m.label} className="px-4 py-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{m.label}</p>
                <p className="font-semibold" style={{ color: m.color || 'var(--text)' }}>{m.value}</p>
              </div>
            ))}
          </div>
          {model.datasets && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {model.datasets.map((d: string) => (
                <span key={d} className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-700"
                  style={{ color: 'var(--muted)' }}>{d}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}