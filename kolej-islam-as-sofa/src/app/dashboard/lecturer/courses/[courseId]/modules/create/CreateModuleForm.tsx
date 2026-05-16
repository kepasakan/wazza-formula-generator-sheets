'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import RichTextEditor from '@/components/RichTextEditor'

type Props = { courseId: string; moduleCount: number }

export default function CreateModuleForm({ courseId, moduleCount }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          orderIndex: moduleCount,
        }),
      })
      if (!res.ok) throw new Error()
      router.push(`/dashboard/lecturer/courses/${courseId}`)
      router.refresh()
    } catch {
      alert('Gagal mencipta modul. Cuba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">Tajuk Modul *</label>
        <input
          className="input w-full"
          placeholder="cth: Bab 1 — Pengenalan Fiqh"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Penerangan Modul
          <span className="ml-1 font-normal text-gray-400">(pilihan)</span>
        </label>
        <p className="text-xs text-gray-400 mb-2">Ringkasan apa yang akan dipelajari dalam modul ini</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <RichTextEditor
            onChange={setDescription}
            placeholder="Huraikan kandungan dan objektif modul ini..."
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          Batal
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || loading}
          className="flex-1 py-2.5 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Simpan Modul
        </button>
      </div>
    </div>
  )
}
