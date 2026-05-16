'use client'

import { useState } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'

type Props = {
  answerId: string
  maxMarks: number
  initialMarks: number | null
  initialFeedback: string | null
}

export default function EssayGrader({ answerId, maxMarks, initialMarks, initialFeedback }: Props) {
  const [marks, setMarks] = useState(initialMarks ?? 0)
  const [feedback, setFeedback] = useState(initialFeedback ?? '')
  const [saved, setSaved] = useState(initialMarks !== null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/quiz-answers/${answerId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks, feedback: feedback.trim() }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
    } catch {
      alert('Gagal menyimpan markah. Cuba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2 mt-2">
      <textarea
        className="w-full border border-blue-100 rounded-lg px-3 py-2 text-xs text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white placeholder-gray-400"
        rows={2}
        placeholder="Komen / nota untuk pelajar (pilihan)..."
        value={feedback}
        onChange={(e) => { setFeedback(e.target.value); setSaved(false) }}
      />
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={maxMarks}
          value={marks}
          onChange={(e) => { setMarks(Number(e.target.value) || 0); setSaved(false) }}
          className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-300"
        />
        <span className="text-xs text-gray-400">/ {maxMarks} markah</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white text-xs rounded-lg hover:bg-green-800 transition disabled:opacity-50 ml-auto"
        >
          {saving
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : saved ? <CheckCircle className="w-3 h-3" /> : null
          }
          {saved ? 'Disimpan' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}
