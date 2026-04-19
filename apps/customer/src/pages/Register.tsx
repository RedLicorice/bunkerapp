import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@bunker/supabase'
import { Dumbbell, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Register() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate                = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role: 'customer' } },
    })
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/schedule', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/30">
            <Dumbbell size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Full name', value: name, onChange: setName, type: 'text', placeholder: 'Alex Smith' },
            { label: 'Email',     value: email, onChange: setEmail, type: 'email', placeholder: 'you@example.com' },
            { label: 'Password',  value: password, onChange: setPassword, type: 'password', placeholder: '8+ characters' },
          ].map(({ label, value, onChange, type, placeholder }) => (
            <div key={label}>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</label>
              <input
                type={type}
                required
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder-zinc-600 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder={placeholder}
              />
            </div>
          ))}

          {error && (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3.5 text-sm font-semibold text-white transition',
              'hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60',
            )}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Have an account?{' '}
          <Link to="/login" className="font-medium text-brand-500 hover:text-brand-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
