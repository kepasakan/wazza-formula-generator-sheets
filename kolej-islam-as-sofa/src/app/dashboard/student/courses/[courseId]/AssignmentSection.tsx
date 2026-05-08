'use client'

import { useState, useRef } from 'react'
import {
  FileText, Clock, CheckCircle, AlertCircle,
  UploadCloud, Loader2, X,
} from 'lucide-react'

type Submission = {
  id: string
  status: 'SUBMITTED' | 'GRADED' | 'LATE'
  score: number | null
  feedback: string | null
  submittedAt: string
  fileUrl: string | null
  notes: string | null
}

type Assignment = {
  id: string
  title: string
  description: string | null
  dueDate: string
  maxScore: number
  submissions: Submission[]
}

export default function AssignmentSection({ assignments: initial }: { assignments: Assignment[] }) {
  const [assignments, setAssignments] = useState<Assignment[]>(initial)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const openModal = (id: string) => {
    setSubmitting(id)
    setFile(null)
    setNotes('')
  }

  const handleSubmit = async () => {
    if (!submitting || loading) return
    if (!file && !notes.trim()) {
      alert('Sila muat naik fail atau tulis nota.')
      return
    }
    setLoading(true)
    try {
      const form = new FormData()
      if (file) form.append('file', file)
      if (notes.trim()) form.append('notes', notes.trim())

      const res = await fetch(`/api/assignments/${submitting}/submit`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Gagal menghantar')
      }
      const submission = await res.json()
      setAssignments((prev) =>
        prev.map((a) => (a.id === submitting ? { ...a, submissions: [submission] } : a))
      )
      setSubmitting(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ralat semasa menghantar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-gray-400" />
        Tugasan
      </h3>
      <div className="space-y-3">
        {assignments.map((a) => {
          const sub = a.submissions[0] ?? null
          const dueDate = new Date(a.dueDate)
          const isOverdue = dueDate < new Date()
          const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / 86400000)
          const status = sub ? sub.status : isOverdue ? 'OVERDUE' : 'PENDING'

          return (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold text-gray-900">{a.title}</h4>
                    <StatusBadge status={status} score={sub?.score ?? null} maxScore={a.maxScore} />
                  </div>
                  {a.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dueDate.toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                    </span>
                    <span>Markah penuh: {a.maxScore}</span>
                    {status === 'PENDING' && daysLeft > 0 && (
                      <span className={daysLeft <= 3 ? 'text-orange-500 font-medium' : ''}>
                        {daysLeft} hari lagi
                      </span>
                    )}
                  </div>

                  {sub?.feedback && (
                    <div className="mt-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-800">
                      <span className="font-medium">Maklum balas: </span>
                      {sub.feedback}
                    </div>
                  )}

                  {sub && (
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span>
                        Dihantar:{' '}
                        {new Date(sub.submittedAt).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                      </span>
                      {sub.fileUrl && (
                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Lihat fail
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {(status === 'PENDING' || status === 'SUBMITTED' || status === 'LATE') && (
                    <button
                      onClick={() => openModal(a.id)}
                      className={`text-sm px-4 py-2 rounded-xl font-medium transition ${
                        status === 'PENDING'
                          ? 'bg-green-700 text-white hover:bg-green-800'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {status === 'PENDING' ? 'Hantar' : 'Hantar Semula'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit modal */}
      {submitting && (() => {
        const assignment = assignments.find((a) => a.id === submitting)!
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-900">Hantar Tugasan</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{assignment.title}</p>
                </div>
                <button
                  onClick={() => setSubmitting(null)}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Muat Naik Fail{' '}
                    <span className="font-normal text-gray-400">(pilihan)</span>
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                      file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    {file ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700 truncate max-w-[220px]">
                          {file.name}
                        </span>
                        <span className="text-xs text-green-500">
                          ({(file.size / 1024 / 1024).toFixed(1)}MB)
                        </span>
                      </div>
                    ) : (
                      <div>
                        <UploadCloud className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-sm text-gray-500">PDF, Word, atau gambar</p>
                        <p className="text-xs text-gray-400 mt-0.5">Maks 20MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Nota / Jawapan Teks{' '}
                    <span className="font-normal text-gray-400">(pilihan)</span>
                  </label>
                  <textarea
                    className="input resize-none"
                    rows={4}
                    placeholder="Tulis nota atau jawapan teks di sini..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <p className="text-xs text-gray-400">* Sekurang-kurangnya fail atau nota diperlukan</p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSubmitting(null)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || (!file && !notes.trim())}
                    className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Hantar Tugasan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function StatusBadge({
  status,
  score,
  maxScore,
}: {
  status: string
  score: number | null
  maxScore: number
}) {
  if (status === 'GRADED')
    return (
      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
        <CheckCircle className="w-3 h-3" /> Dinilai: {score}/{maxScore}
      </span>
    )
  if (status === 'SUBMITTED')
    return (
      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
        <CheckCircle className="w-3 h-3" /> Dihantar
      </span>
    )
  if (status === 'LATE')
    return (
      <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
        <AlertCircle className="w-3 h-3" /> Lewat
      </span>
    )
  if (status === 'OVERDUE')
    return (
      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
        Tamat Tempoh
      </span>
    )
  return null
}
