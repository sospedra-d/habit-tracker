import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const navItems = [
  { to: '/tareas', label: 'Tareas', icon: '☰' },
  { to: '/habits', label: 'Hábitos', icon: '○' },
  { to: '/hoy', label: 'Hoy', icon: '◆', isCenter: true },
  { to: '/metas', label: 'Metas', icon: '⚑' },
  { to: '/pomodoro', label: 'Focus', icon: '⏱' },
]

export default function DashboardLayout() {
  const navigate = useNavigate()

  return (
    <div className="screen-container">
      {/* Main content */}
      <main className="screen-content">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''} ${item.isCenter ? 'center-item' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            <span className="nav-dot" />
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
