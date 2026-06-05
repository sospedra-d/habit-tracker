import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  // undefined = comprobando, true = hay sesión (enlace válido), false = sin sesión (enlace inválido/expirado)
  const [hasSession, setHasSession] = useState(undefined)

  useEffect(() => {
    // El enlace de recuperación crea una sesión temporal (detectSessionInUrl).
    // Si no hay sesión, el enlace caducó, ya se usó, o se entró directo a /reset.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
    })

    // Por si la sesión se establece un instante después de montar (procesado del hash de la URL).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setHasSession(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) {
        setError(updErr.message)
        return
      }
      setSuccess(true)
      setTimeout(() => navigate('/habits'), 1500)
    } catch (err) {
      setError('Error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="animate-fade-in-up relative z-10 w-full max-w-md mx-4">

        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 bg-red-600">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-200">
            Nueva contraseña
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Elige una contraseña nueva para tu cuenta
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl p-8 bg-neutral-900 border border-neutral-800">

          {hasSession === undefined && (
            <div className="flex items-center justify-center py-6 text-stone-500 text-sm gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
              </svg>
              Verificando enlace...
            </div>
          )}

          {hasSession === false && (
            <div className="text-center space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-red-600/10 border border-red-600/20 text-red-400 text-left">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>Este enlace no es válido o ha caducado. Solicita uno nuevo desde el login.</span>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm tracking-wide bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer"
              >
                Volver al login
              </button>
            </div>
          )}

          {hasSession === true && !success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-stone-500">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm bg-neutral-950 border border-neutral-800 text-stone-300 placeholder:text-stone-600 focus:outline-none focus:border-neutral-600 transition-colors"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </div>

              {/* Confirm */}
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium mb-2 text-stone-500">
                  Repetir contraseña
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm bg-neutral-950 border border-neutral-800 text-stone-300 placeholder:text-stone-600 focus:outline-none focus:border-neutral-600 transition-colors"
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-red-600/10 border border-red-600/20 text-red-400">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm tracking-wide bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                    </svg>
                    Guardando...
                  </span>
                ) : (
                  'Guardar contraseña'
                )}
              </button>
            </form>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>¡Contraseña actualizada! Redirigiendo...</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-xs text-stone-600">
          © 2026 Habit Tracker
        </p>
      </div>
    </div>
  )
}
