import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, CheckCircle, FileText } from 'lucide-react'
import { api } from '../api'

export default function UploadCSV() {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [result,   setResult]   = useState<any>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handle = async (file: File) => {
    if (!file.name.endsWith('.csv')) { setError('Please upload a .csv file'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const d = await api.uploadNurses(file)
      setResult(d)
    } catch { setError('Upload failed — make sure the API is running') }
    setLoading(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handle(file)
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 pb-1">Upload CSV & generate schedule</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
        Upload a CSV of nurse credentials. The system will parse it and run the evolutionary algorithm
        to generate an optimised, fatigue-free shift schedule.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all
          ${dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}>
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handle(f) }} />

        <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4">
          <Upload size={28} className="text-indigo-600" />
        </div>
        <p className="font-semibold text-lg mb-2" style={{ color: 'var(--text)' }}>
          {loading ? 'Uploading...' : 'Drop your CSV here or click to browse'}
        </p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Expected columns: nurse_id, name, role, department, shift_preference,
          max_hours_per_week, max_consecutive_shifts, days_available
        </p>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle size={22} className="text-indigo-600" />
            <h2 className="font-semibold" style={{ color: 'var(--text)' }}>
              Successfully loaded {result.loaded} nurses
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.columns?.map((col: string) => (
              <span key={col} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700"
                style={{ color: 'var(--muted)' }}>
                {col}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>
            Go to <strong style={{ color: 'var(--text)' }}>Shift Schedule</strong> to generate an optimised schedule.
          </p>
        </motion.div>
      )}

      {/* Sample CSV format */}
      <div className="mt-8 rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} style={{ color: 'var(--muted)' }} />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Expected CSV format</h3>
        </div>
        <pre className="text-xs rounded-lg p-4 overflow-x-auto"
          style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
{`nurse_id,name,role,department,shift_preference,max_hours_per_week,max_consecutive_shifts,days_available
N001,Sarah Khan,RN,ICU,Morning,38,5,"Mon,Tue,Wed,Thu,Fri"
N002,James Okafor,RN,Ward 1A,Evening,42,5,"Mon,Tue,Wed,Thu,Fri,Sat"
N003,Priya Sharma,LPN,Ward 2B,Night,36,4,"Tue,Wed,Thu,Fri,Sat,Sun"`}
        </pre>
      </div>
    </div>
  )
}