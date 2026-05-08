'use client'

import { useState } from 'react'
import { Users, X, Search, UserPlus, UserMinus, Loader2, CheckCircle } from 'lucide-react'

type Student = { id: string; name: string; matricNo: string | null }

type Course = {
  id: string
  code: string
  title: string
  enrolledStudents: Student[]
}

type Props = {
  course: Course
  allStudents: Student[]
}

export default function EnrollmentManager({ course, allStudents }: Props) {
  const [show, setShow] = useState(false)
  const [enrolled, setEnrolled] = useState<Student[]>(course.enrolledStudents)
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const enrolledIds = new Set(enrolled.map(s => s.id))
  const notEnrolled = allStudents.filter(s => !enrolledIds.has(s.id))

  const filtered = (list: Student[]) =>
    search.trim()
      ? list.filter(s =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.matricNo ?? '').toLowerCase().includes(search.toLowerCase())
        )
      : list

  const handleEnroll = async (student: Student) => {
    setLoadingId(student.id)
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? 'Gagal mendaftarkan pelajar')
        return
      }
      setEnrolled(prev => [...prev, student].sort((a, b) => a.name.localeCompare(b.name)))
    } catch {
      alert('Ralat rangkaian. Cuba lagi.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleUnenroll = async (student: Student) => {
    setLoadingId(student.id)
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/enrollments/${student.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        alert('Gagal mengeluarkan pelajar')
        return
      }
      setEnrolled(prev => prev.filter(s => s.id !== student.id))
    } catch {
      alert('Ralat rangkaian. Cuba lagi.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      <button
        onClick={() => { setSearch(''); setShow(true) }}
        className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
      >
        <Users className="w-3.5 h-3.5" />
        Pelajar ({enrolled.length})
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900">Urus Pendaftaran Pelajar</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className="font-medium text-green-700">{course.code}</span> — {course.title}
                </p>
              </div>
              <button onClick={() => setShow(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="input pl-9"
                  placeholder="Cari nama atau no. matrik..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Enrolled */}
              <div className="px-6 py-3 border-b border-gray-100 bg-green-50/50">
                <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Berdaftar ({enrolled.length})
                </p>
                {filtered(enrolled).length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">
                    {search ? 'Tiada padanan' : 'Tiada pelajar berdaftar'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {filtered(enrolled).map(s => (
                      <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-green-100">
                        <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 text-xs font-semibold">{s.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                          {s.matricNo && <p className="text-xs text-gray-400">{s.matricNo}</p>}
                        </div>
                        <button
                          onClick={() => handleUnenroll(s)}
                          disabled={loadingId === s.id}
                          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition flex-shrink-0 disabled:opacity-50"
                        >
                          {loadingId === s.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <UserMinus className="w-3 h-3" />
                          }
                          Keluarkan
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Not enrolled */}
              <div className="px-6 py-3">
                <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Belum Daftar ({notEnrolled.length})
                </p>
                {filtered(notEnrolled).length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">
                    {search ? 'Tiada padanan' : notEnrolled.length === 0 ? 'Semua pelajar sudah berdaftar' : 'Tiada pelajar'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {filtered(notEnrolled).map(s => (
                      <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                        <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-500 text-xs font-semibold">{s.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{s.name}</p>
                          {s.matricNo && <p className="text-xs text-gray-400">{s.matricNo}</p>}
                        </div>
                        <button
                          onClick={() => handleEnroll(s)}
                          disabled={loadingId === s.id}
                          className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 hover:bg-green-50 px-2.5 py-1.5 rounded-lg transition flex-shrink-0 border border-green-200 disabled:opacity-50"
                        >
                          {loadingId === s.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <UserPlus className="w-3 h-3" />
                          }
                          Daftar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50 rounded-b-2xl">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{enrolled.length} daripada {allStudents.length} pelajar berdaftar</span>
                <button onClick={() => setShow(false)} className="text-green-700 font-medium hover:underline">
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
