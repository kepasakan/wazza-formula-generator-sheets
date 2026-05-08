'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, ClipboardList, Loader2, X, Clock, Eye, EyeOff, Pencil, BarChart2 } from 'lucide-react'

type Quiz = {
  id: string
  title: string
  description: string | null
  duration: number
  isPublished: boolean
  startTime: string | null
  endTime: string | null
  _count: { questions: number; attempts: number }
}

type Props = {
  courseId: string
  initialQuizzes: Quiz[]
}

export default function QuizManager({ courseId, initialQuizzes }: Props) {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>(initialQuizzes)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('30')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const openModal = () => {
    setTitle('')
    setDescription('')
    setDuration('30')
    setStartTime('')
    setEndTime('')
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!title.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          duration: Number(duration) || 30,
          startTime: startTime || null,
          endTime: endTime || null,
        }),
      })
      if (!res.ok) throw new Error()
      const quiz = await res.json()
      setShowModal(false)
      // Navigate to quiz builder immediately
      router.push(`/dashboard/lecturer/courses/${courseId}/quizzes/${quiz.id}`)
    } catch {
      alert('Gagal mencipta kuiz.')
    } finally {
      setLoading(false)
    }
  }

  const togglePublish = async (quiz: Quiz) => {
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quiz.title,
          description: quiz.description,
          duration: quiz.duration,
          startTime: quiz.startTime,
          endTime: quiz.endTime,
          isPublished: !quiz.isPublished,
        }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setQuizzes((prev) => prev.map((q) => (q.id === updated.id ? { ...q, isPublished: updated.isPublished } : q)))
    } catch {
      alert('Gagal mengemaskini status kuiz.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-green-700" />
          Kuiz
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {quizzes.length} kuiz
          </span>
        </h3>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Kuiz
        </button>
      </div>

      {quizzes.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
          <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Belum ada kuiz dicipta</p>
          <button onClick={openModal} className="mt-3 text-sm text-green-700 hover:text-green-800 font-medium">
            + Tambah kuiz pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{q.title}</h4>
                    {q.isPublished ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Draf
                      </span>
                    )}
                  </div>
                  {q.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{q.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {q.duration} minit
                    </span>
                    <span>{q._count.questions} soalan</span>
                    <span className="text-blue-600 font-medium">{q._count.attempts} cubaan</span>
                    {q.startTime && (
                      <span>
                        Buka: {new Date(q.startTime).toLocaleDateString('ms-MY', { dateStyle: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => togglePublish(q)}
                    title={q.isPublished ? 'Nyahaktif' : 'Aktifkan'}
                    className={`p-2 rounded-lg transition-colors ${
                      q.isPublished
                        ? 'text-green-700 bg-green-50 hover:bg-green-100'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {q.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <Link
                    href={`/dashboard/lecturer/courses/${courseId}/quizzes/${q.id}/results`}
                    className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    Keputusan
                  </Link>
                  <Link
                    href={`/dashboard/lecturer/courses/${courseId}/quizzes/${q.id}`}
                    className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Soalan
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Tambah Kuiz Baru</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Tajuk Kuiz *</label>
                <input
                  className="input"
                  placeholder="cth: Kuiz Bab 1 — Thaharah"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Penerangan <span className="font-normal text-gray-400">(pilihan)</span></label>
                <textarea className="input resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Tempoh (minit)</label>
                <input type="number" min={5} max={180} className="input" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Mula <span className="font-normal text-gray-400">(pilihan)</span></label>
                  <input type="datetime-local" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Tamat <span className="font-normal text-gray-400">(pilihan)</span></label>
                  <input type="datetime-local" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-gray-400">Selepas cipta, anda akan dibawa ke halaman pembina soalan.</p>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Batal</button>
                <button
                  onClick={handleCreate}
                  disabled={!title.trim() || loading}
                  className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cipta & Tambah Soalan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
