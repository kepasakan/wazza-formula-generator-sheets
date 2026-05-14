'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

type Submission = {
  id: string
  status: string
  score: number | null
  feedback: string | null
  submittedAt: string
  fileUrl: string | null
  notes: string | null
}

type Props = {
  assignmentId: string
  maxScore: number
  existingSubmission: Submission | null
  isOverdue: boolean
}

export default function AssignmentSubmitForm({ assignmentId, maxScore, existingSubmission, isOverdue }: Props) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<Submission | null>(existingSubmission)
  const [showResubmit, setShowResubmit] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const canSubmit = !isOverdue && (!submitted || submitted.status !== 'GRADED')
  const showForm = canSubmit && (!submitted || showResubmit)

  const handleSubmit = async () => {
    if (!file && !notes.trim()) {
      setError('Sila muat naik fail atau tulis nota.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      if (file) form.append('file', file)
      if (notes.trim()) form.append('notes', notes.trim())

      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghantar')

      setSubmitted(data)
      setShowResubmit(false)
      setFile(null)
      setNotes('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ralat semasa menghantar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Penghantaran Tugasan</h3>
        {submitted && submitted.status !== 'GRADED' && !isOverdue && !showResubmit && (
          <button
            onClick={() => setShowResubmit(true)}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition"
          >
            Hantar Semula
          </button>
        )}
      </div>

      {/* Already submitted & graded */}
      {submitted?.status === 'GRADED' && (
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Tugasan Telah Dinilai</p>
              <p className="text-sm text-green-600 mt-0.5">
                Markah: <span className="font-bold text-lg">{submitted.score}</span>/{maxScore}
              </p>
            </div>
          </div>
          {submitted.feedback && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
              <p className="text-xs font-semibold text-blue-600 mb-1">Maklum Balas Pensyarah</p>
              <p className="text-sm text-blue-900">{submitted.feedback}</p>
            </div>
          )}
          {submitted.fileUrl && (
            <a
              href={submitted.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <FileText className="w-4 h-4" />
              Lihat fail yang dihantar
            </a>
          )}
        </div>
      )}

      {/* Submitted, waiting for grade */}
      {submitted && submitted.status !== 'GRADED' && !showResubmit && (
        <div className="px-6 py-5 space-y-3">
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-blue-800">
                {submitted.status === 'LATE' ? 'Dihantar (Lewat)' : 'Dihantar — Menunggu Penilaian'}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                {new Date(submitted.submittedAt).toLocaleDateString('ms-MY', { dateStyle: 'full' })}
              </p>
            </div>
          </div>
          {submitted.notes && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 whitespace-pre-line">
              {submitted.notes}
            </div>
          )}
          {submitted.fileUrl && (
            <a
              href={submitted.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <FileText className="w-4 h-4" />
              Lihat fail yang dihantar
            </a>
          )}
        </div>
      )}

      {/* Overdue, not submitted */}
      {isOverdue && !submitted && (
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="font-semibold text-red-700">Tempoh Penghantaran Telah Tamat</p>
          </div>
        </div>
      )}

      {/* Submit form */}
      {showForm && (
        <div className="px-6 py-5 space-y-5">
          {showResubmit && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              Penghantaran baru akan menggantikan yang sebelumnya.
            </div>
          )}

          {/* File upload */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Muat Naik Fail <span className="font-normal text-gray-400">(PDF, Word, Gambar — maks 20MB)</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 text-green-600" />
                  <p className="font-medium text-green-700">{file.name}</p>
                  <p className="text-xs text-green-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setFile(null) }}
                    className="text-xs text-red-500 hover:text-red-700 mt-1"
                  >
                    Buang fail
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-10 h-10 text-gray-300" />
                  <p className="text-gray-500 font-medium">Seret fail ke sini atau klik untuk pilih</p>
                  <p className="text-xs text-gray-400">PDF, Word, atau gambar (maks 20MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Nota / Jawapan Teks <span className="font-normal text-gray-400">(pilihan)</span>
            </label>
            <textarea
              className="input resize-none"
              rows={5}
              placeholder="Tulis jawapan atau nota tambahan di sini..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            {showResubmit && (
              <button
                onClick={() => setShowResubmit(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Batal
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading || (!file && !notes.trim())}
              className="flex-1 py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Menghantar...' : 'Hantar Tugasan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
