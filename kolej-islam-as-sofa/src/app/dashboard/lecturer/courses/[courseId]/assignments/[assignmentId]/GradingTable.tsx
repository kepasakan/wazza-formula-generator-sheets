'use client'

import { useState } from 'react'
import {
  CheckCircle, Clock, AlertCircle, FileText,
  ChevronDown, ChevronRight, Loader2, Save, ExternalLink,
} from 'lucide-react'

type Attachment = { id: string; type: 'FILE' | 'LINK'; url: string; filename: string | null }

type Submission = {
  id: string
  status: 'SUBMITTED' | 'GRADED' | 'LATE'
  score: number | null
  feedback: string | null
  submittedAt: string
  notes: string | null
  attachments: Attachment[]
}

type StudentRow = {
  studentId: string
  name: string
  matricNo: string | null
  submission: Submission | null
}

type Props = {
  students: StudentRow[]
  maxScore: number
}

export default function GradingTable({ students: initial, maxScore }: Props) {
  const [students, setStudents] = useState<StudentRow[]>(initial)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [scores, setScores] = useState<Record<string, string>>({})
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleGrade = async (studentId: string, submissionId: string) => {
    const scoreStr = scores[studentId]
    const score = Number(scoreStr)
    if (scoreStr === undefined || scoreStr === '' || isNaN(score) || score < 0 || score > maxScore) {
      alert(`Masukkan markah antara 0 dan ${maxScore}`)
      return
    }
    setSaving(studentId)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, feedback: feedbacks[studentId] ?? '' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Gagal menyimpan')
      }
      const updated = await res.json()
      setStudents((prev) =>
        prev.map((s) =>
          s.studentId === studentId
            ? { ...s, submission: { ...s.submission!, ...updated } }
            : s
        )
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ralat semasa menyimpan markah.')
    } finally {
      setSaving(null)
    }
  }

  const submitted = students.filter((s) => s.submission)
  const notSubmitted = students.filter((s) => !s.submission)

  return (
    <div className="space-y-3">
      {submitted.map((row) => {
        const sub = row.submission!
        const isExpanded = expanded.has(row.studentId)
        const isGraded = sub.status === 'GRADED'

        return (
          <div key={row.studentId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Student row */}
            <div
              className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggle(row.studentId)}
            >
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 text-xs font-semibold">
                  {row.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{row.name}</p>
                {row.matricNo && <p className="text-xs text-gray-400">{row.matricNo}</p>}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {isGraded ? (
                  <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle className="w-3 h-3" /> {sub.score}/{maxScore}
                  </span>
                ) : sub.status === 'LATE' ? (
                  <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                    <AlertCircle className="w-3 h-3" /> Lewat
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    <Clock className="w-3 h-3" /> Belum Dinilai
                  </span>
                )}
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>

            {/* Expanded: submission details + grade form */}
            {isExpanded && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                {/* Submission info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-gray-500">
                    Dihantar:{' '}
                    {new Date(sub.submittedAt).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                  </p>

                  {sub.notes && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Jawapan pelajar:</p>
                      <div
                        className="rich-content text-sm text-gray-700 bg-white rounded-lg px-3 py-2 border border-gray-200"
                        dangerouslySetInnerHTML={{ __html: sub.notes }}
                      />
                    </div>
                  )}

                  {sub.attachments?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Lampiran:</p>
                      <div className="space-y-1.5">
                        {sub.attachments.filter(a => a.type === 'FILE').map(a => (
                          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                            {a.filename ?? 'Fail lampiran'}
                          </a>
                        ))}
                        {sub.attachments.filter(a => a.type === 'LINK').map(a => (
                          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline break-all">
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            {a.url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Grade form */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Penilaian</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={maxScore}
                        placeholder={isGraded ? String(sub.score) : '0'}
                        defaultValue={isGraded ? String(sub.score) : ''}
                        onChange={(e) =>
                          setScores((prev) => ({ ...prev, [row.studentId]: e.target.value }))
                        }
                        className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-400">/ {maxScore}</span>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Maklum balas untuk pelajar (pilihan)..."
                    defaultValue={sub.feedback ?? ''}
                    onChange={(e) =>
                      setFeedbacks((prev) => ({ ...prev, [row.studentId]: e.target.value }))
                    }
                    className="input resize-none"
                  />
                  <button
                    onClick={() => handleGrade(row.studentId, sub.id)}
                    disabled={saving === row.studentId}
                    className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition font-medium disabled:opacity-50"
                  >
                    {saving === row.studentId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isGraded ? 'Kemaskini Markah' : 'Simpan Markah'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Not submitted */}
      {notSubmitted.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-500">Belum Hantar ({notSubmitted.length})</p>
          </div>
          <div className="divide-y divide-gray-50">
            {notSubmitted.map((row) => (
              <div key={row.studentId} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-500 text-xs font-semibold">
                    {row.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{row.name}</p>
                  {row.matricNo && <p className="text-xs text-gray-400">{row.matricNo}</p>}
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Tiada submission
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
