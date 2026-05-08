'use client'

import { useState } from 'react'
import {
  Plus, Trash2, Loader2, X, ChevronDown, ChevronRight, CheckCircle,
} from 'lucide-react'

type Option = { id: string; optionText: string; isCorrect: boolean; orderIndex: number }
type Question = {
  id: string
  questionText: string
  type: 'MCQ' | 'TRUE_FALSE'
  marks: number
  orderIndex: number
  options: Option[]
}

type Props = {
  quizId: string
  initialQuestions: Question[]
  totalMarks: number
}

type DraftOption = { text: string; isCorrect: boolean }

export default function QuestionBuilder({ quizId, initialQuestions, totalMarks: initTotal }: Props) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [totalMarks, setTotalMarks] = useState(initTotal)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // New question form state
  const [qText, setQText] = useState('')
  const [qType, setQType] = useState<'MCQ' | 'TRUE_FALSE'>('MCQ')
  const [qMarks, setQMarks] = useState(1)
  const [draftOptions, setDraftOptions] = useState<DraftOption[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ])
  const [tfCorrect, setTfCorrect] = useState<'true' | 'false'>('true')

  const openModal = () => {
    setQText('')
    setQType('MCQ')
    setQMarks(1)
    setDraftOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }])
    setTfCorrect('true')
    setShowModal(true)
  }

  const setCorrectOption = (idx: number) =>
    setDraftOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === idx })))

  const updateOptionText = (idx: number, text: string) =>
    setDraftOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, text } : o)))

  const addOption = () => {
    if (draftOptions.length < 4) setDraftOptions((prev) => [...prev, { text: '', isCorrect: false }])
  }

  const removeOption = (idx: number) => {
    if (draftOptions.length <= 2) return
    setDraftOptions((prev) => prev.filter((_, i) => i !== idx))
  }

  const buildOptions = () => {
    if (qType === 'TRUE_FALSE') {
      return [
        { optionText: 'Betul', isCorrect: tfCorrect === 'true' },
        { optionText: 'Salah', isCorrect: tfCorrect === 'false' },
      ]
    }
    return draftOptions.map((o) => ({ optionText: o.text.trim(), isCorrect: o.isCorrect }))
  }

  const canSubmit = () => {
    if (!qText.trim()) return false
    if (qType === 'MCQ') {
      const valid = draftOptions.every((o) => o.text.trim())
      const hasCorrect = draftOptions.some((o) => o.isCorrect)
      return valid && hasCorrect
    }
    return true // TRUE_FALSE always valid
  }

  const handleAddQuestion = async () => {
    if (!canSubmit() || loading) return
    setLoading(true)
    try {
      const options = buildOptions()
      const res = await fetch(`/api/quizzes/${quizId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText: qText.trim(), type: qType, marks: qMarks, options }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Gagal menambah soalan')
      }
      const q = await res.json()
      setQuestions((prev) => [...prev, q])
      setTotalMarks((t) => t + qMarks)
      setShowModal(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ralat semasa menambah soalan.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (questionId: string, marks: number) => {
    setDeleting(questionId)
    try {
      const res = await fetch(`/api/questions/${questionId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setQuestions((prev) => prev.filter((q) => q.id !== questionId))
      setTotalMarks((t) => t - marks)
      setExpanded((prev) => { const next = new Set(prev); next.delete(questionId); return next })
    } catch {
      alert('Gagal memadam soalan.')
    } finally {
      setDeleting(null)
    }
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">
            Senarai Soalan
            <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {questions.length} soalan · {totalMarks} markah
            </span>
          </h3>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Soalan
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">Belum ada soalan. Klik &quot;Tambah Soalan&quot; untuk mula.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const isExpanded = expanded.has(q.id)
            return (
              <div key={q.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="flex items-start gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggle(q.id)}
                >
                  <span className="text-xs font-bold text-gray-300 w-5 text-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-relaxed">{q.questionText}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{q.type === 'MCQ' ? 'MCQ' : 'Betul/Salah'}</span>
                      <span className="text-xs text-gray-400">{q.marks} markah</span>
                      <span className="text-xs text-gray-400">{q.options.length} pilihan</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(q.id, q.marks) }}
                    disabled={deleting === q.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    {deleting === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-3 space-y-2">
                    {q.options.map((opt) => (
                      <div key={opt.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${opt.isCorrect ? 'bg-green-50' : 'bg-gray-50'}`}>
                        {opt.isCorrect && <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                        {!opt.isCorrect && <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />}
                        <span className={`text-sm ${opt.isCorrect ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                          {opt.optionText}
                        </span>
                        {opt.isCorrect && <span className="text-xs text-green-600 ml-auto">Jawapan betul</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Question Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-semibold text-gray-900">Tambah Soalan</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Type selector */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Jenis Soalan</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['MCQ', 'TRUE_FALSE'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setQType(t)}
                      className={`py-2.5 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                        qType === t ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {t === 'MCQ' ? 'Pelbagai Pilihan (MCQ)' : 'Betul / Salah'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question text */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Teks Soalan *</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Taip soalan di sini..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Marks */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Markah</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="input w-24"
                  value={qMarks}
                  onChange={(e) => setQMarks(Number(e.target.value) || 1)}
                />
              </div>

              {/* Options */}
              {qType === 'MCQ' ? (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Pilihan Jawapan{' '}
                    <span className="font-normal text-gray-400">(klik bulatan untuk tandakan betul)</span>
                  </label>
                  <div className="space-y-2">
                    {draftOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCorrectOption(i)}
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                            opt.isCorrect ? 'border-green-600 bg-green-600' : 'border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {opt.isCorrect && <div className="w-2 h-2 bg-white rounded-full mx-auto" />}
                        </button>
                        <input
                          className="input flex-1"
                          placeholder={`Pilihan ${i + 1}`}
                          value={opt.text}
                          onChange={(e) => updateOptionText(i, e.target.value)}
                        />
                        {draftOptions.length > 2 && (
                          <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0 p-1">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {draftOptions.length < 4 && (
                    <button onClick={addOption} className="mt-2 text-sm text-green-700 hover:text-green-800 font-medium flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Tambah pilihan
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Jawapan Betul</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['true', 'false'] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => setTfCorrect(val)}
                        className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          tfCorrect === val ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {val === 'true' ? '✓ Betul' : '✗ Salah'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Batal</button>
                <button
                  onClick={handleAddQuestion}
                  disabled={!canSubmit() || loading}
                  className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Tambah Soalan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
