'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus, ChevronDown, ChevronRight,
  Play, FileText, AlignLeft, Link2,
  Pencil, Trash2, Loader2, BookOpen, X, Eye, EyeOff,
} from 'lucide-react'

type ContentType = 'VIDEO' | 'PDF' | 'TEXT' | 'LINK'

type ModuleContent = {
  id: string
  type: ContentType
  title: string
  contentUrl: string | null
  youtubeId: string | null
  textContent: string | null
  orderIndex: number
}

type Module = {
  id: string
  title: string
  description: string | null
  orderIndex: number
  isPublished: boolean
  contents: ModuleContent[]
}

type Props = {
  courseId: string
  initialModules: Module[]
}

const CONTENT_ICON: Record<ContentType, React.ReactNode> = {
  VIDEO: <Play className="w-3.5 h-3.5" />,
  PDF: <FileText className="w-3.5 h-3.5" />,
  TEXT: <AlignLeft className="w-3.5 h-3.5" />,
  LINK: <Link2 className="w-3.5 h-3.5" />,
}

const CONTENT_COLOR: Record<ContentType, string> = {
  VIDEO: 'bg-red-50 text-red-600',
  PDF: 'bg-blue-50 text-blue-600',
  TEXT: 'bg-amber-50 text-amber-600',
  LINK: 'bg-purple-50 text-purple-600',
}

const CONTENT_LABEL: Record<ContentType, string> = {
  VIDEO: 'Video',
  PDF: 'PDF',
  TEXT: 'Nota',
  LINK: 'Pautan',
}

export default function ModuleManager({ courseId, initialModules }: Props) {
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleTogglePublish = async (mod: Module) => {
    if (togglingId) return
    setTogglingId(mod.id)
    try {
      const res = await fetch(`/api/modules/${mod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !mod.isPublished }),
      })
      if (!res.ok) throw new Error()
      const { isPublished } = await res.json()
      setModules((prev) => prev.map((m) => m.id === mod.id ? { ...m, isPublished } : m))
    } catch {
      alert('Gagal menukar status modul.')
    } finally {
      setTogglingId(null)
    }
  }

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleDeleteModule = async (moduleId: string) => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/modules/${moduleId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setModules((prev) => prev.filter((m) => m.id !== moduleId))
      setDeletingModuleId(null)
    } catch {
      alert('Gagal memadam modul.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-green-700" />
          Pengurusan Modul
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {modules.length} modul
          </span>
        </h3>
        <Link
          href={`/dashboard/lecturer/courses/${courseId}/modules/create`}
          className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Modul
        </Link>
      </div>

      {modules.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Belum ada modul</p>
          <p className="text-sm text-gray-400 mt-1">Klik &quot;Tambah Modul&quot; untuk mula menambah kandungan kursus</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod, idx) => {
            const isExpanded = expanded.has(mod.id)
            return (
              <div key={mod.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(mod.id)}
                >
                  <span className="text-xs font-bold text-gray-300 w-5 text-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{mod.title}</p>
                    {mod.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate"
                        dangerouslySetInnerHTML={{ __html: mod.description.replace(/<[^>]+>/g, ' ').trim() }}
                      />
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 mr-1">
                    {mod.contents.length} kandungan
                  </span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleTogglePublish(mod)}
                      disabled={togglingId === mod.id}
                      title={mod.isPublished ? 'Disiarkan — klik untuk sembunyikan' : 'Draf — klik untuk siarkan'}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all font-medium ${
                        mod.isPublished
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {togglingId === mod.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : mod.isPublished
                          ? <Eye className="w-3 h-3" />
                          : <EyeOff className="w-3 h-3" />
                      }
                      {mod.isPublished ? 'Siar' : 'Draf'}
                    </button>
                    <Link
                      href={`/dashboard/lecturer/courses/${courseId}/modules/${mod.id}/edit`}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => setDeletingModuleId(mod.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-1">
                    {mod.contents.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-2">Tiada kandungan lagi</p>
                    )}
                    {mod.contents.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50">
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${CONTENT_COLOR[c.type]}`}>
                          {CONTENT_ICON[c.type]}
                          <span>{CONTENT_LABEL[c.type]}</span>
                        </span>
                        <span className="flex-1 text-sm text-gray-700 truncate">{c.title}</span>
                        {(c.youtubeId || c.contentUrl) && (
                          <a
                            href={c.youtubeId ? `https://youtube.com/watch?v=${c.youtubeId}` : c.contentUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Buka
                          </a>
                        )}
                      </div>
                    ))}
                    <Link
                      href={`/dashboard/lecturer/courses/${courseId}/modules/${mod.id}/edit`}
                      className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium py-2 px-3 hover:bg-green-50 rounded-lg transition-colors w-full mt-1"
                    >
                      <Plus className="w-4 h-4" />
                      Urus Kandungan
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete module confirm */}
      {deletingModuleId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Padam Modul?</h3>
              <button onClick={() => setDeletingModuleId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">Modul dan semua kandungannya akan dipadam. Tindakan ini tidak boleh dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingModuleId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                Batal
              </button>
              <button
                onClick={() => handleDeleteModule(deletingModuleId)}
                disabled={loading}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Ya, Padam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
