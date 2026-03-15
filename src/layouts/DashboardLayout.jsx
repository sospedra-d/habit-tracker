import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'

const navItems = [
  {
    to: '/habits',
    label: 'Mis Hábitos',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/pomodoro',
    label: 'Pomodoro',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen w-[260px] flex flex-col
          border-r backdrop-blur-xl transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 px-5 py-6 border-b"
             style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'var(--accent-gradient)' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Habit Tracker
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Dashboard
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-widest"
             style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
            Navegación
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive ? 'shadow-lg' : 'hover:scale-[1.02]'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--accent-gradient)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 15px rgba(108, 99, 255, 0.3)' : 'none',
              })}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 py-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(233, 69, 96, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar (mobile) */}
        <header
          className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b backdrop-blur-xl"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Habit Tracker
          </h2>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
