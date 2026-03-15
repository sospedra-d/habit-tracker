export default function Pomodoro() {
  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Pomodoro
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Gestiona tu tiempo con la técnica Pomodoro
        </p>
      </div>

      {/* Timer Card */}
      <div
        className="rounded-2xl border p-12 text-center backdrop-blur-sm max-w-lg mx-auto"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        {/* Timer Display */}
        <div className="mb-8">
          <div
            className="inline-flex items-center justify-center w-48 h-48 rounded-full border-4 mb-6"
            style={{
              borderColor: 'var(--accent-primary)',
              boxShadow: '0 0 40px rgba(108, 99, 255, 0.2), inset 0 0 40px rgba(108, 99, 255, 0.05)',
            }}
          >
            <span className="text-5xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
              25:00
            </span>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
            Sesión de Enfoque
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer"
            style={{
              background: 'var(--accent-gradient)',
              boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
            }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Iniciar
          </button>
          <button
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
            </svg>
            Reiniciar
          </button>
        </div>
      </div>

      {/* Session Type Pills */}
      <div className="flex items-center justify-center gap-3 mt-8">
        {[
          { label: 'Enfoque', minutes: '25 min', active: true },
          { label: 'Descanso Corto', minutes: '5 min', active: false },
          { label: 'Descanso Largo', minutes: '15 min', active: false },
        ].map((session) => (
          <button
            key={session.label}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 cursor-pointer"
            style={{
              background: session.active ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.05)',
              color: session.active ? '#ffffff' : 'var(--text-secondary)',
              border: session.active ? 'none' : '1px solid var(--border-subtle)',
            }}
          >
            {session.label} · {session.minutes}
          </button>
        ))}
      </div>
    </div>
  )
}
