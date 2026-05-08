'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Eye, EyeOff, Loader2 } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@assofa.edu.my', password: 'Admin@123', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { role: 'Pensyarah', email: 'ustaz.ahmad@assofa.edu.my', password: 'Lecturer@123', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { role: 'Pelajar', email: 'izzat@student.assofa.edu.my', password: 'Student@123', color: 'bg-green-100 text-green-800 border-green-200' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.message || 'Login gagal. Sila cuba lagi.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[0]) {
    setEmail(account.email)
    setPassword(account.password)
    setError('')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #172540 0%, #1e3a6e 50%, #0d9488 100%)' }}>
        {/* Geometric pattern */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 8 }).map((_, i) =>
            Array.from({ length: 8 }).map((__, j) => (
              <div
                key={`${i}-${j}`}
                className="absolute w-20 h-20 border border-white rotate-45"
                style={{ left: `${j * 12.5}%`, top: `${i * 12.5}%` }}
              />
            ))
          )}
        </div>

        <div className="relative z-10 text-center">
          <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <BookOpen className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">LMS As-Sofa</h1>
          <p className="text-teal-200 text-xl font-medium mb-2">Kolej Islam As-Sofa</p>
          <p className="text-blue-200/80 text-sm max-w-xs leading-relaxed">
            Sistem Pengurusan Pembelajaran yang komprehensif untuk memudahkan proses pengajaran dan pembelajaran.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Pelajar Aktif', value: '1,200+' },
              { label: 'Kursus', value: '45+' },
              { label: 'Pensyarah', value: '38' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-teal-200 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#0d9488' }}>
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">LMS As-Sofa</h1>
            <p className="text-gray-500 text-sm">Kolej Islam As-Sofa</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Selamat Datang</h2>
              <p className="text-gray-500 text-sm mt-1">Log masuk untuk meneruskan pembelajaran</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Alamat E-mel
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@assofa.edu.my"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Kata Laluan
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata laluan"
                    required
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sedang log masuk...
                  </>
                ) : (
                  'Log Masuk'
                )}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-3 text-center uppercase tracking-wide">
                Akaun Demo — Klik untuk isi
              </p>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => fillDemo(account)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition hover:opacity-80 ${account.color}`}
                  >
                    <span className="font-semibold">{account.role}</span>
                    <span className="font-mono text-xs opacity-75">{account.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            © 2026 Kolej Islam As-Sofa. Hak cipta terpelihara.
          </p>
        </div>
      </div>
    </div>
  )
}
