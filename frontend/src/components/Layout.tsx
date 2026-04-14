import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Calendar, Upload, Users, Activity,
  FileText, Settings, LogOut, Moon, Sun, Bell, ChevronLeft, ChevronRight, Shield
} from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'

const NAV = [
  { section: 'Main',
    items: [
      { to: '/',         icon: LayoutDashboard, label: 'Dashboard'      },
      { to: '/schedule', icon: Calendar,        label: 'Schedule'       },
      { to: '/upload',   icon: Upload,          label: 'Upload CSV',    badge: 'New' },
      { to: '/nurses',   icon: Users,           label: 'Nurses'         },
    ]
  },
  { section: 'Analytics',
    items: [
      { to: '/fatigue',  icon: Activity,  label: 'Fatigue Monitor', badge: '!' },
      { to: '/reports',  icon: FileText,  label: 'Reports'          },
    ]
  },
  { section: 'System',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
    ]
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/':         'Dashboard',
  '/schedule': 'Shift Schedule',
  '/upload':   'Upload CSV',
  '/nurses':   'Nurses',
  '/fatigue':  'Fatigue Monitor',
  '/reports':  'Reports',
  '/settings': 'Settings',
}

function NavItem({ to, icon: Icon, label, badge, collapsed }: any) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          'relative flex items-center rounded-xl transition-all duration-150 group',
          collapsed ? 'mx-2 px-0 py-3.5 justify-center' : 'mx-3 px-4 py-3 gap-3',
          isActive
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
            : 'text-slate-400 hover:bg-white/7 hover:text-slate-200',
        ].join(' ')
      }
    >
      <Icon size={19} className="flex-shrink-0" />

      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            className="whitespace-nowrap overflow-hidden flex-1 text-[13.5px] font-medium"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {!collapsed && badge && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none flex-shrink-0
            ${badge === 'New'
              ? 'bg-emerald-400/20 text-emerald-300'
              : 'bg-red-500 text-white'
            }`}
        >
          {badge}
        </span>
      )}

      {/* Tooltip while collapsed */}
      {collapsed && (
        <span
          className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs
                     whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50
                     shadow-xl border border-white/10 transition-opacity duration-150"
        >
          {label}
        </span>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const nav      = useNavigate()
  const location = useLocation()
  const { dark, toggle } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  const user     = JSON.parse(localStorage.getItem('user') || '{}')
  const initials = (user.name || 'HN')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const pageTitle = PAGE_TITLES[location.pathname] || 'NurseGuard'
  const logout    = () => { localStorage.removeItem('user'); nav('/login') }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 264 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="flex flex-col h-full flex-shrink-0 overflow-hidden"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        {/* Logo row */}
        <div
          className="flex items-center px-3 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--sidebar-border)', minHeight: 'var(--topbar-h)' }}
        >
          <div className="flex items-center flex-1 min-w-0 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700
                            flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-900/40">
              <Shield size={17} className="text-white" />
            </div>

            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                  className="ml-3 min-w-0 overflow-hidden"
                >
                  <p className="text-white font-bold text-[15px] leading-none tracking-tight whitespace-nowrap">
                    NurseGuard
                  </p>
                  <p className="text-slate-500 text-[11px] mt-1 whitespace-nowrap">CareSync v2.1</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setCollapsed(c => !c)}
            className="flex-shrink-0 ml-1 w-7 h-7 rounded-lg flex items-center justify-center
                       text-slate-600 hover:text-slate-300 hover:bg-white/8 transition-colors"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-6 overflow-x-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {NAV.map(group => (
            <div key={group.section}>
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-6 mb-3 text-[11px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: 'var(--sidebar-section)' }}
                  >
                    {group.section}
                  </motion.p>
                )}
              </AnimatePresence>
              {collapsed && (
                <div className="mx-4 mb-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {group.items.map(item => (
                  <NavItem key={item.to} {...item} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User + footer */}
        <div
          className="flex-shrink-0 p-4"
          style={{ borderTop: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          {/* User card */}
          {!collapsed && (
            <div
              className="flex items-center gap-3 px-3 py-3 rounded-xl mb-1"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700
                               flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[12px] font-bold">{initials}</span>
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-white text-[13px] font-semibold leading-none truncate">
                  {user.name || 'Admin'}
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5 truncate">
                  {user.title || 'Head Nurse'}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={toggle}
            className="flex items-center w-full rounded-lg text-slate-400
                       hover:bg-white/7 hover:text-slate-200 transition-colors
                       px-3 py-2.5 gap-3"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {!collapsed && (
              <span className="text-[13px] font-medium">
                {dark ? 'Light mode' : 'Dark mode'}
              </span>
            )}
          </button>

          <button
            onClick={logout}
            className="flex items-center w-full rounded-lg
                       text-red-500/70 hover:bg-red-500/10 hover:text-red-400 transition-colors
                       px-3 py-2.5 gap-3"
          >
            <LogOut size={16} />
            {!collapsed && (
              <span className="text-[13px] font-medium">Sign out</span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header
          className="flex items-center justify-between px-8 flex-shrink-0"
          style={{
            height:       'var(--topbar-h)',
            background:   'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Left */}
          <div className="min-w-0 mr-4">
            <h1 className="font-bold text-[15px] leading-none truncate" style={{ color: 'var(--text)' }}>
              {pageTitle}
            </h1>
            <p className="text-[11px] mt-1.5 truncate" style={{ color: 'var(--muted)' }}>
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Bell */}
            <button
              className="relative w-9 h-9 rounded-xl flex items-center justify-center
                          transition-colors hover:bg-slate-100"
              style={{ color: 'var(--muted)' }}
            >
              <Bell size={17} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            {/* User chip */}
            <div
              className="flex items-center gap-2.5 pl-3"
              style={{ borderLeft: '1px solid var(--border)' }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700
                               flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[12px] font-bold">{initials}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-[13px] font-semibold leading-none" style={{ color: 'var(--text)' }}>
                  {user.name || 'Admin'}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  {user.role || 'Admin'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}