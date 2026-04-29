import { useRef, useCallback } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/tareas', label: 'Tareas', icon: '☰' },
  { to: '/habits', label: 'Hábitos', icon: '○' },
  { to: '/hoy', label: 'Hoy', icon: '◆', isCenter: true },
  { to: '/metas', label: 'Metas', icon: '⚑' },
  { to: '/pomodoro', label: 'Focus', icon: '⏱' },
]

const routes = navItems.map(n => n.to)

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const touchRef = useRef({ startX: 0, startY: 0 })

  const currentIndex = routes.indexOf(location.pathname)

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    touchRef.current = { startX: touch.clientX, startY: touch.clientY }
  }, [])

  const onTouchEnd = useCallback((e) => {
    const touch = e.changedTouches[0]
    const deltaX = touchRef.current.startX - touch.clientX
    const deltaY = Math.abs(touchRef.current.startY - touch.clientY)
    const absDeltaX = Math.abs(deltaX)

    // Only swipe if horizontal movement > 50px and greater than vertical movement
    if (absDeltaX < 50 || deltaY > absDeltaX) return

    const idx = routes.indexOf(location.pathname)
    if (idx === -1) return

    if (deltaX > 0 && idx < routes.length - 1) {
      // Swipe left → next tab
      navigate(routes[idx + 1])
    } else if (deltaX < 0 && idx > 0) {
      // Swipe right → previous tab
      navigate(routes[idx - 1])
    }
  }, [navigate, location.pathname])

  return (
    <div className="screen-container" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Main content with swipe transition */}
      <main className="screen-content">
        <div key={location.pathname} className="anim-tab-slide">
          <Outlet />
        </div>
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
