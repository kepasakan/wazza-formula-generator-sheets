'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FileText, Clock, Hash } from 'lucide-react'
import RichTextEditor from '@/components/RichTextEditor'

type Props = {
  courseId: string
  assignment: {
    id: string
    title: string
    description: string | null
    dueDate: string
    maxScore: number
  }
}

export default function EditAssignmentForm({ courseId, assignment }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(assignment.title)
  const [description, setDescription] = useState(assignment.description ?? '')
  const [dueDate, setDueDate] = useState(
    new Date(assignment.dueDate).toISOString().slice(0, 16)
  )
  const [maxScore, setMaxScore] = useState(String(assignment.maxScore))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!title.trim() || !dueDate || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          dueDate,
          maxScore: Number(maxScore) || 100,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Gagal mengemaskini tugasan')
      }
      router.push(`/dashboard/lecturer/courses/${courseId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ralat tidak diketahui')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <FileText className="w-4 h-4 text-green-700" />
          Tajuk Tugasan *
        </label>
        <input
          className="input text-base"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <FileText className="w-4 h-4 text-green-700" />
          Arahan & Penerangan Tugasan
          <span className="font-normal text-gray-400">(pilihan)</span>
        </label>
        <RichTextEditor
          onChange={setDescription}
          initialContent={assignment.description ?? ''}
          placeholder="Tulis arahan tugasan secara terperinci..."
        />
      </div>

      {/* Settings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Tetapan Tugasan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
              <Clock className="w-4 h-4" />
              Tarikh & Masa Akhir *
            </label>
            <input
              type="datetime-local"
              className="input"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
              <Hash className="w-4 h-4" />
              Markah Penuh *
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              className="input"
              value={maxScore}
              onChange={e => setMaxScore(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex gap-3 pb-6">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition font-medium"
        >
          Batal
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !dueDate || loading}
          className="flex-1 py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Simpan Perubahan
        </button>
      </div>
    </div>
  )
}
