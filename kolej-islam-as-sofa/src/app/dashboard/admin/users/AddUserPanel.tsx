'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, X, Loader2 } from 'lucide-react'

type Role = 'STUDENT' | 'LECTURER' | 'ADMIN'

export default function AddUserPanel() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<Role>('STUDENT')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [matricNo, setMatricNo] = useState('')
  const [staffId, setStaffId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName(''); setEmail(''); setPassword(''); setMatricNo(''); setStaffId(''); setError(null)
    setRole('STUDENT')
  }

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Nama, email dan kata laluan diperlukan')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role, matricNo, staffId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menambah pengguna'); return }
      setShow(false)
      reset()
      router.refresh()
    } catch {
      setError('Ralat rangkaian. Cuba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => { reset(); setShow(true) }}
        className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2.5 rounded-xl hover:bg-green-800 transition font-medium"
      >
        <UserPlus className="w-4 h-4" />
        Tambah Pengguna
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Tambah Pengguna Baru</h3>
              <button onClick={() => setShow(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Role selector */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Peranan</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'STUDENT', label: 'Pelajar', color: 'border-green-600 bg-green-50 text-green-700' },
                    { value: 'LECTURER', label: 'Pensyarah', color: 'border-blue-600 bg-blue-50 text-blue-700' },
                    { value: 'ADMIN', label: 'Pentadbir', color: 'border-purple-600 bg-purple-50 text-purple-700' },
                  ] as const).map(r => (
                    <button
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${role === r.value ? r.color : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Nama Penuh *</label>
                <input className="input" placeholder="cth: Muhammad Ali bin Hassan" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Email *</label>
                <input className="input" type="email" placeholder="cth: ali@student.assofa.edu.my" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Kata Laluan *</label>
                <input className="input" type="password" placeholder="Minimum 8 aksara" value={password} onChange={e => setPassword(e.target.value)} />
              </div>

              {role === 'STUDENT' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">No. Matrik <span className="font-normal text-gray-400">(pilihan)</span></label>
                  <input className="input" placeholder="cth: AS2024001" value={matricNo} onChange={e => setMatricNo(e.target.value)} />
                </div>
              )}
              {role === 'LECTURER' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">No. Staf <span className="font-normal text-gray-400">(pilihan)</span></label>
                  <input className="input" placeholder="cth: STF001" value={staffId} onChange={e => setStaffId(e.target.value)} />
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShow(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Batal</button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Tambah Pengguna
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
