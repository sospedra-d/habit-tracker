import { useRef, useCallback, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'

const FocusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="10" cy="10" r="8.5" />
    <line x1="10" y1="10" x2="10" y2="4" />
    <line x1="10" y1="10" x2="15" y2="10" />
  </svg>
)

const navItems = [
  { to: '/tareas', label: 'Tareas', icon: '☰' },
  { to: '/habits', label: 'Hábitos', icon: '○' },
  { to: '/hoy', label: 'Hoy', icon: '◆', isCenter: true },
  { to: '/metas', label: 'Metas', icon: '⚑' },
  { to: '/pomodoro', label: 'Focus', icon: null, IconComponent: FocusIcon },
]

const routes = navItems.map(n => n.to)

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const touchRef = useRef({ startX: 0, startY: 0, swiping: false, decided: false })
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [swipeTransition, setSwipeTransition] = useState(false)

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    touchRef.current = { startX: touch.clientX, startY: touch.clientY, swiping: false, decided: false }
    setSwipeTransition(false)
    setSwipeOffset(0)
  }, [])

  const onTouchMove = useCallback((e) => {
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchRef.current.startX
    const deltaY = Math.abs(touch.clientY - touchRef.current.startY)
    const absDeltaX = Math.abs(deltaX)

    // Decide direction once
    if (!touchRef.current.decided) {
      if (absDeltaX > 10 || deltaY > 10) {
        touchRef.current.decided = true
        touchRef.current.swiping = absDeltaX > deltaY
      }
      return
    }

    if (!touchRef.current.swiping) return

    // Check boundaries
    const idx = routes.indexOf(location.pathname)
    if (idx === -1) return

    // Limit swipe at edges
    if (deltaX > 0 && idx === 0) {
      setSwipeOffset(deltaX * 0.2) // resistance at edge
    } else if (deltaX < 0 && idx === routes.length - 1) {
      setSwipeOffset(deltaX * 0.2) // resistance at edge
    } else {
      setSwipeOffset(deltaX)
    }
  }, [location.pathname])

  const onTouchEnd = useCallback((e) => {
    if (!touchRef.current.swiping) {
      setSwipeOffset(0)
      return
    }

    const idx = routes.indexOf(location.pathname)
    if (idx === -1) {
      setSwipeOffset(0)
      return
    }

    const threshold = 80

    if (swipeOffset < -threshold && idx < routes.length - 1) {
      // Swipe left → next tab
      setSwipeTransition(true)
      setSwipeOffset(-window.innerWidth)
      setTimeout(() => {
        navigate(routes[idx + 1])
        setSwipeOffset(0)
        setSwipeTransition(false)
      }, 250)
    } else if (swipeOffset > threshold && idx > 0) {
      // Swipe right → prev tab
      setSwipeTransition(true)
      setSwipeOffset(window.innerWidth)
      setTimeout(() => {
        navigate(routes[idx - 1])
        setSwipeOffset(0)
        setSwipeTransition(false)
      }, 250)
    } else {
      // Snap back
      setSwipeTransition(true)
      setSwipeOffset(0)
      setTimeout(() => setSwipeTransition(false), 200)
    }

    touchRef.current.swiping = false
  }, [navigate, location.pathname, swipeOffset])

  return (
    <div className="screen-container" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <main className="screen-content">
        <div
          key={location.pathname}
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transition: swipeTransition ? 'transform 0.25s ease-out' : 'none',
            willChange: 'transform'
          }}
        >
          <Outlet />
        </div>
      </main>

      <nav className="bottom-nav">
        {navItems.map(item => {
          const isActive = location.pathname === item.to
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={`nav-item ${isActive ? 'active' : ''} ${item.isCenter ? 'center-item' : ''}`}
            >
              <span className="nav-icon">
                {item.IconComponent ? <item.IconComponent /> : item.icon}
              </span>
              <span className="nav-label">{item.label}</span>
              <span className="nav-dot" />
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
