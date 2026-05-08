'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, FileText, Loader2, X } from 'lucide-react'

type Assignment = {
  id: string
  title: string
  description: string | null
  dueDate: string
  maxScore: number
  submissions: { id: string; status: string }[]
}

type Props = {
  courseId: string
  totalEnrolled: number
  initialAssignments: Assignment[]
}

export default function AssignmentManager({ courseId, totalEnrolled, initialAssignments }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [maxScore, setMaxScore] = useState('100')

  const openModal = () => {
    setTitle('')
    setDescription('')
    setDueDate('')
    setMaxScore('100')
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!title.trim() || !dueDate || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          dueDate,
          maxScore: Number(maxScore),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Gagal mencipta tugasan')
      }
      const created = await res.json()
      setAssignments((prev) => [...prev, { ...created, dueDate: created.dueDate, submissions: [] }])
      setShowModal(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ralat semasa mencipta tugasan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-green-700" />
          Tugasan
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {assignments.length} tugasan
          </span>
        </h3>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Tugasan
        </button>
      </div>

      {/* List */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Belum ada tugasan dicipta</p>
          <button
            onClick={openModal}
            className="mt-3 text-sm text-green-700 hover:text-green-800 font-medium"
          >
            + Tambah tugasan pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const totalSub = a.submissions.length
            const totalGraded = a.submissions.filter((s) => s.status === 'GRADED').length
            const isOverdue = new Date() > new Date(a.dueDate)

            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">{a.title}</h4>
                    {a.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>
                        Tarikh akhir:{' '}
                        {new Date(a.dueDate).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                        {isOverdue && <span className="text-red-500 ml-1">(Tamat)</span>}
                      </span>
                      <span>Markah: {a.maxScore}</span>
                      <span className="text-blue-600 font-medium">
                        {totalSub}/{totalEnrolled} dihantar
                      </span>
                      {totalGraded > 0 && (
                        <span className="text-green-600 font-medium">{totalGraded} dinilai</span>
                      )}
                      {totalSub - totalGraded > 0 && (
                        <span className="text-orange-600 font-medium">
                          {totalSub - totalGraded} perlu nilai
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/lecturer/courses/${courseId}/assignments/${a.id}`}
                    className="flex-shrink-0 text-sm bg-green-700 text-white px-4 py-2 rounded-xl hover:bg-green-800 transition font-medium"
                  >
                    Nilai Tugasan
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Tambah Tugasan Baru</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Tajuk *</label>
                <input
                  className="input"
                  placeholder="cth: Tugasan 1 — Esei Fiqh Ibadat"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Penerangan <span className="font-normal text-gray-400">(pilihan)</span>
                </label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Arahan ringkas untuk pelajar..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Tarikh Akhir *
                  </label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Markah Penuh *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    className="input"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!title.trim() || !dueDate || loading}
                  className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cipta Tugasan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
