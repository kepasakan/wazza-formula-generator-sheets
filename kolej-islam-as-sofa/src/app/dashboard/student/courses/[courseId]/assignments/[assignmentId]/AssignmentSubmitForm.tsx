'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  UploadCloud, FileText, Link2, Loader2,
  CheckCircle, AlertCircle, ExternalLink, X, Plus,
} from 'lucide-react'
import RichTextEditor from '@/components/RichTextEditor'

type Attachment = { id: string; type: 'FILE' | 'LINK'; url: string; filename: string | null }

type Submission = {
  id: string
  status: string
  score: number | null
  feedback: string | null
  submittedAt: string
  notes: string | null
  attachments: Attachment[]
}

type Props = {
  assignmentId: string
  maxScore: number
  existingSubmission: Submission | null
  isOverdue: boolean
}

export default function AssignmentSubmitForm({ assignmentId, maxScore, existingSubmission, isOverdue }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [links, setLinks] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<Submission | null>(existingSubmission)
  const [showResubmit, setShowResubmit] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const canSubmit = !isOverdue && (!submitted || submitted.status !== 'GRADED')
  const showForm = canSubmit && (!submitted || showResubmit)

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    const next = [...files]
    Array.from(incoming).forEach(f => {
      if (!next.find(x => x.name === f.name && x.size === f.size)) next.push(f)
    })
    setFiles(next)
  }

  function removeFile(idx: number) {
    setFiles(files.filter((_, i) => i !== idx))
  }

  function updateLink(idx: number, val: string) {
    setLinks(links.map((l, i) => i === idx ? val : l))
  }

  function addLink() { setLinks([...links, '']) }

  function removeLink(idx: number) {
    const next = links.filter((_, i) => i !== idx)
    setLinks(next.length === 0 ? [''] : next)
  }

  const handleSubmit = async () => {
    const hasNotes = notes && notes !== '<p></p>' && notes.trim() !== ''
    const hasFiles = files.length > 0
    const validLinks = links.map(l => l.trim()).filter(Boolean)

    if (!hasNotes && !hasFiles && validLinks.length === 0) {
      setError('Sila tulis jawapan, lampirkan fail, atau masukkan pautan.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const form = new FormData()
      if (hasNotes) form.append('notes', notes)
      files.forEach(f => form.append('files', f))
      validLinks.forEach(l => form.append('links', l))

      const res = await fetch(`/api/assignments/${assignmentId}/submit`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghantar')

      setSubmitted(data)
      setShowResubmit(false)
      setNotes('')
      setFiles([])
      setLinks([''])
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
          <button onClick={() => setShowResubmit(true)} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition">
            Hantar Semula
          </button>
        )}
      </div>

      {/* Graded */}
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
          <SubmissionPreview submission={submitted} />
        </div>
      )}

      {/* Submitted, waiting */}
      {submitted && submitted.status !== 'GRADED' && !showResubmit && (
        <div className="px-6 py-5 space-y-4">
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
          <SubmissionPreview submission={submitted} />
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

      {/* Form */}
      {showForm && (
        <div className="px-6 py-5 space-y-6">
          {showResubmit && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              Penghantaran baru akan menggantikan yang sebelumnya termasuk semua lampiran.
            </div>
          )}

          {/* Rich text answer */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Jawapan / Kandungan</label>
            <RichTextEditor
              onChange={html => setNotes(html)}
              placeholder="Tulis jawapan, huraian, atau nota di sini..."
              initialContent=""
            />
          </div>

          {/* Multi-file upload */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Lampiran Fail
              <span className="text-gray-400 font-normal ml-1">(pilihan — boleh pilih lebih dari satu)</span>
            </label>

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
              className="border-2 border-dashed border-gray-200 hover:border-teal-400 hover:bg-teal-50/30 rounded-xl p-5 text-center cursor-pointer transition-all"
            >
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={e => addFiles(e.target.files)}
              />
              <UploadCloud className="w-7 h-7 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Seret fail ke sini atau <span className="text-teal-600 font-medium">klik untuk pilih</span></p>
              <p className="text-xs text-gray-400 mt-0.5">PDF, Word, atau gambar — maks 20MB setiap fail</p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                    <FileText className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{f.name}</p>
                      <p className="text-xs text-gray-400">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic links */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Pautan
              <span className="text-gray-400 font-normal ml-1">(pilihan — Google Drive, GitHub, YouTube, dll)</span>
            </label>
            <div className="space-y-2">
              {links.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="url"
                      value={l}
                      onChange={e => updateLink(i, e.target.value)}
                      placeholder="https://..."
                      className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {links.length > 1 && (
                    <button type="button" onClick={() => removeLink(i)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLink}
              className="mt-2 flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah pautan lain
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            {showResubmit && (
              <button onClick={() => setShowResubmit(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                Batal
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading}
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

function SubmissionPreview({ submission }: { submission: Submission }) {
  const hasNotes = !!(submission.notes?.trim()) && submission.notes !== '<p></p>'
  const fileAttachments = submission.attachments?.filter(a => a.type === 'FILE') ?? []
  const linkAttachments = submission.attachments?.filter(a => a.type === 'LINK') ?? []

  if (!hasNotes && fileAttachments.length === 0 && linkAttachments.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Submission Anda</p>

      {hasNotes && (
        <div
          className="rich-content bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700"
          dangerouslySetInnerHTML={{ __html: submission.notes! }}
        />
      )}

      {fileAttachments.length > 0 && (
        <div className="space-y-1.5">
          {fileAttachments.map(a => (
            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <FileText className="w-4 h-4 flex-shrink-0" />
              {a.filename ?? 'Fail lampiran'}
            </a>
          ))}
        </div>
      )}

      {linkAttachments.length > 0 && (
        <div className="space-y-1.5">
          {linkAttachments.map(a => (
            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline break-all">
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              {a.url}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
