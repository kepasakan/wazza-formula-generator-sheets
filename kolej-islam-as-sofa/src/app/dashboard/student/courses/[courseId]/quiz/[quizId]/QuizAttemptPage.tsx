'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Clock, CheckCircle, XCircle, AlertCircle, Loader2, ChevronLeft, FileText,
} from 'lucide-react'

type Option = { id: string; optionText: string }
type Question = { id: string; questionText: string; type: string; marks: number; orderIndex: number; options: Option[] }

type ResultItem = {
  questionId: string
  questionText: string
  type: string
  marks: number
  isCorrect: boolean | null
  marksAwarded: number | null
  essayAnswer: string | null
  essayFeedback: string | null
  selectedOptionId: string | null
  selectedOptionText: string | null
  correctOptionId: string | null
  correctOptionText: string | null
  options: { id: string; optionText: string; isCorrect: boolean }[]
}

type ExistingAttempt = {
  id: string
  startedAt: string
  status: 'IN_PROGRESS' | 'SUBMITTED'
  score: number | null
}

type Props = {
  quizId: string
  courseId: string
  courseCode: string
  quizTitle: string
  quizDescription: string | null
  duration: number
  questions: Question[]
  existingAttempt: ExistingAttempt | null
  initialResults: ResultItem[] | null
  totalMarks: number
}

export default function QuizAttemptPage({
  quizId, courseId, courseCode, quizTitle, quizDescription,
  duration, questions, existingAttempt, initialResults, totalMarks,
}: Props) {
  const [phase, setPhase] = useState<'intro' | 'taking' | 'result'>(
    existingAttempt?.status === 'SUBMITTED' ? 'result' : 'intro'
  )
  const [attempt, setAttempt] = useState<ExistingAttempt | null>(existingAttempt)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<ResultItem[] | null>(initialResults)
  const [finalScore, setFinalScore] = useState<number | null>(existingAttempt?.score ?? null)
  const submitRef = useRef(false)

  useEffect(() => {
    if (phase !== 'taking' || !attempt) return
    const endMs = new Date(attempt.startedAt).getTime() + duration * 60 * 1000
    const tick = () => {
      const left = Math.max(0, endMs - Date.now())
      setTimeLeft(left)
      if (left === 0 && !submitRef.current) handleSubmit(true)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase, attempt])

  const formatTime = (ms: number) => {
    const total = Math.floor(ms / 1000)
    const m = Math.floor(total / 60).toString().padStart(2, '0')
    const s = (total % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const startQuiz = async () => {
    setStarting(true)
    try {
      const res = await fetch(`/api/quizzes/${quizId}/attempt`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const a = await res.json()
      setAttempt(a)
      setPhase('taking')
    } catch {
      alert('Gagal memulakan kuiz. Cuba lagi.')
    } finally {
      setStarting(false)
    }
  }

  const answeredCount = questions.filter((q) =>
    q.type === 'ESSAY' ? !!essayAnswers[q.id]?.trim() : !!answers[q.id]
  ).length

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitRef.current || !attempt) return
    if (!auto) {
      if (answeredCount < questions.length) {
        const unanswered = questions.length - answeredCount
        if (!confirm(`Masih ada ${unanswered} soalan belum dijawab. Hantar sekarang?`)) return
      }
    }
    submitRef.current = true
    setSubmitting(true)
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: q.type !== 'ESSAY' ? (answers[q.id] ?? null) : null,
        essayAnswer: q.type === 'ESSAY' ? (essayAnswers[q.id] ?? null) : null,
      }))
      const res = await fetch(`/api/attempts/${attempt.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFinalScore(data.score)
      setResults(data.results)
      setPhase('result')
    } catch {
      submitRef.current = false
      alert('Gagal menghantar kuiz. Cuba lagi.')
    } finally {
      setSubmitting(false)
    }
  }, [attempt, answers, essayAnswers, questions, answeredCount])

  const pct = totalMarks > 0 && finalScore !== null ? Math.round((finalScore / totalMarks) * 100) : 0
  const hasUngradedEssay = results?.some((r) => r.type === 'ESSAY' && r.marksAwarded === null) ?? false

  // ── INTRO ──
  if (phase === 'intro') {
    const essayCount = questions.filter((q) => q.type === 'ESSAY').length
    return (
      <div className="max-w-2xl space-y-6">
        <Link href={`/dashboard/student/courses/${courseId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeft className="w-4 h-4" /> {courseCode}
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-purple-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{quizTitle}</h2>
            {quizDescription && <p className="text-gray-500 text-sm mt-1">{quizDescription}</p>}
          </div>
          <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-100">
            <div>
              <p className="text-2xl font-bold text-gray-900">{duration}</p>
              <p className="text-xs text-gray-400 mt-0.5">minit</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">soalan</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalMarks}</p>
              <p className="text-xs text-gray-400 mt-0.5">markah</p>
            </div>
          </div>
          {essayCount > 0 && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 text-left">
              <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Kuiz ini mengandungi <strong>{essayCount} soalan subjektif</strong> yang perlu dinilai oleh pensyarah secara manual.</span>
            </div>
          )}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 text-left">
            <strong>Perhatian:</strong> Masa akan mula dikira sebaik anda klik &quot;Mula Kuiz&quot;. Pastikan anda bersedia sebelum memulakan.
          </div>
          <button
            onClick={startQuiz}
            disabled={starting}
            className="w-full py-3.5 bg-purple-700 text-white rounded-xl font-semibold text-base hover:bg-purple-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {starting && <Loader2 className="w-5 h-5 animate-spin" />}
            Mula Kuiz
          </button>
        </div>
      </div>
    )
  }

  // ── TAKING ──
  if (phase === 'taking') {
    const isWarning = timeLeft !== null && timeLeft < 5 * 60 * 1000
    const isCritical = timeLeft !== null && timeLeft < 60 * 1000

    return (
      <div className="max-w-3xl space-y-5">
        <div className={`sticky top-0 z-10 flex items-center justify-between px-5 py-3 rounded-xl border shadow-sm transition-colors ${
          isCritical ? 'bg-red-600 border-red-700 text-white' :
          isWarning ? 'bg-orange-500 border-orange-600 text-white' :
          'bg-white border-gray-200 text-gray-900'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{quizTitle}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isCritical || isWarning ? 'bg-white/20' : 'bg-gray-100'}`}>
              {answeredCount}/{questions.length} dijawab
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono font-bold text-lg">
            <Clock className="w-5 h-5" />
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
        </div>

        {questions.map((q, idx) => {
          const isAnswered = q.type === 'ESSAY' ? !!essayAnswers[q.id]?.trim() : !!answers[q.id]
          return (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3 mb-4">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                  isAnswered ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 leading-relaxed">{q.questionText}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400">{q.marks} markah</p>
                    {q.type === 'ESSAY' && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Subjektif</span>
                    )}
                  </div>
                </div>
              </div>

              {q.type === 'ESSAY' ? (
                <div className="ml-10">
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                    rows={5}
                    placeholder="Taip jawapan anda di sini..."
                    value={essayAnswers[q.id] ?? ''}
                    onChange={(e) => setEssayAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="space-y-2 ml-10">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt.id
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                          selected
                            ? 'border-purple-600 bg-purple-50 text-purple-900 font-medium'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                          selected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                        }`}>
                          {selected && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                        </div>
                        {opt.optionText}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-4">
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="w-full py-3.5 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            Hantar Kuiz
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT ──
  return (
    <div className="max-w-3xl space-y-6">
      <Link href={`/dashboard/student/courses/${courseId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ChevronLeft className="w-4 h-4" /> {courseCode}
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
          hasUngradedEssay ? 'bg-blue-100' : pct >= 70 ? 'bg-green-100' : pct >= 50 ? 'bg-orange-100' : 'bg-red-100'
        }`}>
          <span className={`text-2xl font-bold ${hasUngradedEssay ? 'text-blue-700' : pct >= 70 ? 'text-green-700' : pct >= 50 ? 'text-orange-700' : 'text-red-700'}`}>
            {hasUngradedEssay ? '?' : `${pct}%`}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {finalScore ?? 0}/{totalMarks} markah
        </h2>
        {hasUngradedEssay ? (
          <p className="text-blue-600 text-sm mt-1">Menunggu penilaian soalan subjektif oleh pensyarah</p>
        ) : (
          <p className="text-gray-500 mt-1">
            {pct >= 70 ? 'Tahniah! Prestasi cemerlang.' : pct >= 50 ? 'Boleh lagi. Teruskan usaha!' : 'Perlu lebih banyak ulang kaji.'}
          </p>
        )}

        {!hasUngradedEssay && (
          <div className="w-full bg-gray-100 rounded-full h-2.5 mt-5">
            <div
              className={`h-2.5 rounded-full transition-all ${pct >= 70 ? 'bg-green-600' : pct >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {results && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Semakan Jawapan</h3>
          {results.map((r, idx) => {
            if (r.type === 'ESSAY') {
              const graded = r.marksAwarded !== null
              return (
                <div key={r.questionId} className={`bg-white rounded-xl border overflow-hidden ${graded ? 'border-green-200' : 'border-blue-200'}`}>
                  <div className={`flex items-start gap-3 px-5 py-4 ${graded ? 'bg-green-50' : 'bg-blue-50'}`}>
                    {graded
                      ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      : <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    }
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="text-gray-400 mr-2">S{idx + 1}.</span>
                        {r.questionText}
                      </p>
                      <p className={`text-xs mt-0.5 font-medium ${graded ? 'text-green-700' : 'text-blue-600'}`}>
                        {graded ? `${r.marksAwarded}/${r.marks} markah` : 'Menunggu penilaian pensyarah'}
                      </p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full flex-shrink-0">Subjektif</span>
                  </div>
                  <div className="px-5 py-3 space-y-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Jawapan anda:</p>
                      {r.essayAnswer ? (
                        <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {r.essayAnswer}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Tidak dijawab</p>
                      )}
                    </div>
                    {r.essayFeedback && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                        <span className="text-amber-500 text-xs font-bold flex-shrink-0 mt-0.5">💬</span>
                        <div>
                          <p className="text-xs font-medium text-amber-700 mb-0.5">Komen Pensyarah</p>
                          <p className="text-sm text-amber-800 whitespace-pre-wrap">{r.essayFeedback}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            const isCorrect = r.isCorrect === true
            return (
              <div key={r.questionId} className={`bg-white rounded-xl border overflow-hidden ${isCorrect ? 'border-green-200' : 'border-red-200'}`}>
                <div className={`flex items-start gap-3 px-5 py-4 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                  {isCorrect
                    ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  }
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      <span className="text-gray-400 mr-2">S{idx + 1}.</span>
                      {r.questionText}
                    </p>
                    <p className={`text-xs mt-0.5 ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                      {isCorrect ? `+${r.marks} markah` : '0 markah'}
                    </p>
                  </div>
                </div>
                <div className="px-5 py-3 space-y-1.5">
                  {r.options.map((opt) => {
                    const isSelected = opt.id === r.selectedOptionId
                    const isOptCorrect = opt.isCorrect
                    return (
                      <div key={opt.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                        isOptCorrect ? 'bg-green-50 text-green-800' :
                        isSelected && !isOptCorrect ? 'bg-red-50 text-red-700' :
                        'text-gray-500'
                      }`}>
                        {isOptCorrect && <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                        {isSelected && !isOptCorrect && <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                        {!isOptCorrect && !isSelected && <div className="w-3.5 h-3.5 flex-shrink-0" />}
                        <span>{opt.optionText}</span>
                        {isOptCorrect && <span className="ml-auto text-xs text-green-600 font-medium">Betul</span>}
                        {isSelected && !isOptCorrect && <span className="ml-auto text-xs text-red-500">Jawapan anda</span>}
                      </div>
                    )
                  })}
                  {!r.selectedOptionId && r.type !== 'ESSAY' && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 px-3">
                      <AlertCircle className="w-3.5 h-3.5" /> Tidak dijawab
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!results && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Tiada data semakan tersedia.
        </div>
      )}
    </div>
  )
}
