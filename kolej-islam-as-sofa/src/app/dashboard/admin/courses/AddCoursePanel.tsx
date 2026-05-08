'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookMarked, X, Loader2 } from 'lucide-react'

type Lecturer = { id: string; name: string; staffId: string | null }

export default function AddCoursePanel({ lecturers }: { lecturers: Lecturer[] }) {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [semester, setSemester] = useState('Semester 1')
  const [year, setYear] = useState('2025/2026')
  const [lecturerId, setLecturerId] = useState(lecturers[0]?.id ?? '')

  const reset = () => {
    setTitle(''); setCode(''); setDescription('')
    setSemester('Semester 1'); setYear('2025/2026')
    setLecturerId(lecturers[0]?.id ?? '')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !code.trim() || !lecturerId) {
      setError('Tajuk, kod dan pensyarah diperlukan')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, code, description, semester, year, lecturerId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal mencipta kursus'); return }
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
        <BookMarked className="w-4 h-4" />
        Tambah Kursus
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-semibold text-gray-900">Tambah Kursus Baru</h3>
              <button onClick={() => setShow(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Nama Kursus *</label>
                <input className="input" placeholder="cth: Fiqh Ibadat" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Kod Kursus *</label>
                  <input
                    className="input uppercase"
                    placeholder="cth: FIQ1101"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Sesi Akademik *</label>
                  <input className="input" placeholder="cth: 2025/2026" value={year} onChange={e => setYear(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Semester *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Semester 1', 'Semester 2', 'Semester 3'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSemester(s)}
                      className={`py-2 rounded-xl border-2 text-xs font-medium transition-all ${semester === s ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Pensyarah *</label>
                <select
                  className="input"
                  value={lecturerId}
                  onChange={e => setLecturerId(e.target.value)}
                >
                  {lecturers.length === 0 && <option value="">Tiada pensyarah berdaftar</option>}
                  {lecturers.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}{l.staffId ? ` (${l.staffId})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Penerangan <span className="font-normal text-gray-400">(pilihan)</span>
                </label>
                <textarea className="input resize-none" rows={3} placeholder="Penerangan ringkas kursus..." value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShow(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Batal</button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || lecturers.length === 0}
                  className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cipta Kursus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
