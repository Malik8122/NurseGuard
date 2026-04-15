import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Shield } from 'lucide-react'
import { api } from '../api'

export default function Login() {
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const d = await api.login(username, password)
      if (d.ok) {
        localStorage.setItem('user', JSON.stringify({ username, role: d.role, name: d.name, title: d.title }))
        nav('/')
      } else {
        setError(d.message || 'Invalid credentials')
      }
    } catch {
      setError('Cannot reach server. Make sure the API is running on port 8000.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #0f2a1a 100%)' }}>

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-16 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />

        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }} className="relative z-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Shield size={30} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">NurseGuard</h1>
          <p className="text-indigo-400 font-medium mb-2">CareSync v2.1</p>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            AI-powered workforce optimization for modern healthcare teams.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { label: 'Smart scheduling', icon: '📅' },
              { label: 'Fatigue AI', icon: '🧠' },
              { label: 'Real-time alerts', icon: '⚡' },
            ].map(f => (
              <div key={f.label} className="p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-2xl mb-2">{f.icon}</p>
                <p className="text-slate-400 text-xs font-medium">{f.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8"
        style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }} className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold">NurseGuard</p>
              <p className="text-slate-500 text-xs">CareSync v2.1</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-8">Sign in to your account to continue</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-400 uppercase tracking-wider">
                Username
              </label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="e.g. admin" required
                className="w-full px-5 py-4 rounded-xl text-[15px] outline-none transition-all font-medium"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full px-5 py-4 pr-12 rounded-xl text-[15px] outline-none transition-all font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-xs px-4 py-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
                {error}
              </motion.div>
            )}

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </motion.button>
          </form>

          <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-center text-[11px] text-slate-600 mb-3 uppercase tracking-wider font-semibold">Demo credentials</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { user: 'admin',   pw: 'admin123',   role: 'Admin'   },
                { user: 'nurse1',  pw: 'nurse123',   role: 'Nurse'   },
                { user: 'manager', pw: 'manager123', role: 'Manager' },
              ].map(c => (
                <button key={c.user} onClick={() => { setUsername(c.user); setPassword(c.pw) }}
                  className="p-2.5 rounded-lg text-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                  <p className="text-[10px] font-bold text-indigo-400">{c.role}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-mono">{c.user}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}