'use client'

import { useState, useRef } from 'react'
import {
  Plus, ChevronDown, ChevronRight,
  Play, FileText, AlignLeft, Link2,
  Pencil, Trash2, Loader2, BookOpen, X, UploadCloud,
} from 'lucide-react'
import RichTextEditor from '@/components/RichTextEditor'

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

  const [showAddModule, setShowAddModule] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [addingContentTo, setAddingContentTo] = useState<string | null>(null)
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null)
  const [deletingContentId, setDeletingContentId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)

  // Add module form
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')

  // Edit module form
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // Add content form
  const [cType, setCType] = useState<ContentType>('VIDEO')
  const [cTitle, setCTitle] = useState('')
  const [cUrl, setCUrl] = useState('')
  const [richContent, setRichContent] = useState('')   // for TEXT/Nota - HTML from Tiptap
  const [cDesc, setCDesc] = useState('')               // description for VIDEO/PDF/LINK
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [editorKey, setEditorKey] = useState(0)        // force remount Tiptap on modal open
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // --- Add module ---
  const handleAddModule = async () => {
    if (!newTitle.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() || null, orderIndex: modules.length }),
      })
      if (!res.ok) throw new Error()
      const mod = await res.json()
      setModules((prev) => [...prev, { ...mod, contents: [] }])
      setShowAddModule(false)
      setNewTitle('')
      setNewDesc('')
    } catch {
      alert('Gagal menambah modul. Cuba lagi.')
    } finally {
      setLoading(false)
    }
  }

  // --- Edit module ---
  const openEdit = (mod: Module) => {
    setEditingModule(mod)
    setEditTitle(mod.title)
    setEditDesc(mod.description ?? '')
  }

  const handleEditModule = async () => {
    if (!editingModule || !editTitle.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/modules/${editingModule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), description: editDesc.trim() || null }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setModules((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)))
      setEditingModule(null)
    } catch {
      alert('Gagal mengemaskini modul.')
    } finally {
      setLoading(false)
    }
  }

  // --- Delete module ---
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

  // --- Add content ---
  const openAddContent = (moduleId: string) => {
    setAddingContentTo(moduleId)
    setCType('VIDEO')
    setCTitle('')
    setCUrl('')
    setRichContent('')
    setCDesc('')
    setPdfFile(null)
    setUploadProgress('idle')
    setEditorKey((k) => k + 1)
    setExpanded((prev) => new Set([...prev, moduleId]))
  }

  const handleAddContent = async () => {
    if (!addingContentTo || !cTitle.trim() || loading) return
    setLoading(true)
    try {
      let youtubeId: string | null = null
      let finalUrl: string | null = cUrl.trim() || null

      if (cType === 'VIDEO' && cUrl.trim()) {
        const match = cUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
        if (match) {
          youtubeId = match[1]
          finalUrl = null
        }
      }

      if (cType === 'PDF') {
        if (!pdfFile) {
          alert('Sila pilih fail PDF.')
          setLoading(false)
          return
        }
        setUploadProgress('uploading')
        const form = new FormData()
        form.append('file', pdfFile)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: form })
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}))
          throw new Error(err.error ?? 'Upload failed')
        }
        const { url } = await uploadRes.json()
        finalUrl = url
        setUploadProgress('done')
      }

      const res = await fetch(`/api/modules/${addingContentTo}/contents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: cType,
          title: cTitle.trim(),
          contentUrl: finalUrl,
          youtubeId,
          textContent: cType === 'TEXT' ? (richContent || null) : (cDesc.trim() || null),
        }),
      })
      if (!res.ok) throw new Error()
      const content = await res.json()
      setModules((prev) =>
        prev.map((m) =>
          m.id === addingContentTo ? { ...m, contents: [...m.contents, content] } : m
        )
      )
      setAddingContentTo(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menambah kandungan.')
      setUploadProgress('idle')
    } finally {
      setLoading(false)
    }
  }

  // --- Delete content ---
  const handleDeleteContent = async (contentId: string) => {
    if (loading) return
    const moduleId = modules.find((m) => m.contents.some((c) => c.id === contentId))?.id
    if (!moduleId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/contents/${contentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, contents: m.contents.filter((c) => c.id !== contentId) } : m
        )
      )
      setDeletingContentId(null)
    } catch {
      alert('Gagal memadam kandungan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-green-700" />
          Pengurusan Modul
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {modules.length} modul
          </span>
        </h3>
        <button
          onClick={() => setShowAddModule(true)}
          className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Modul
        </button>
      </div>

      {/* Module list */}
      {modules.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Belum ada modul</p>
          <p className="text-sm text-gray-400 mt-1">
            Klik &quot;Tambah Modul&quot; untuk mula menambah kandungan kursus
          </p>
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
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{mod.title}</p>
                    {mod.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{mod.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 mr-2">
                    {mod.contents.length} kandungan
                  </span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(mod)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
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
                      <div
                        key={c.id}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 group"
                      >
                        <span
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${CONTENT_COLOR[c.type]}`}
                        >
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
                        <button
                          onClick={() => setDeletingContentId(c.id)}
                          className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => openAddContent(mod.id)}
                      className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium py-2 px-3 hover:bg-green-50 rounded-lg transition-colors w-full mt-1"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Kandungan
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ===== MODALS ===== */}

      {showAddModule && (
        <Modal title="Tambah Modul Baru" onClose={() => setShowAddModule(false)}>
          <div className="space-y-4">
            <Field label="Tajuk Modul *">
              <input
                className="input"
                placeholder="cth: Bab 1 — Pengenalan Fiqh"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}
              />
            </Field>
            <Field label="Penerangan (pilihan)">
              <textarea className="input resize-none" rows={3} placeholder="Penerangan ringkas..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </Field>
            <ModalActions onCancel={() => setShowAddModule(false)} onConfirm={handleAddModule} loading={loading} disabled={!newTitle.trim()} label="Simpan Modul" />
          </div>
        </Modal>
      )}

      {editingModule && (
        <Modal title="Edit Modul" onClose={() => setEditingModule(null)}>
          <div className="space-y-4">
            <Field label="Tajuk Modul *">
              <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleEditModule()} />
            </Field>
            <Field label="Penerangan (pilihan)">
              <textarea className="input resize-none" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </Field>
            <ModalActions onCancel={() => setEditingModule(null)} onConfirm={handleEditModule} loading={loading} disabled={!editTitle.trim()} label="Kemaskini" />
          </div>
        </Modal>
      )}

      {addingContentTo && (
        <Modal title="Tambah Kandungan" onClose={() => setAddingContentTo(null)}>
          <div className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Jenis Kandungan</label>
              <div className="grid grid-cols-4 gap-2">
                {(['VIDEO', 'PDF', 'TEXT', 'LINK'] as ContentType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setCType(type); setPdfFile(null); setCUrl(''); setCDesc(''); setRichContent(''); setEditorKey((k) => k + 1) }}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-medium transition-all ${
                      cType === type
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <span className={`${CONTENT_COLOR[type]} p-1.5 rounded-lg`}>{CONTENT_ICON[type]}</span>
                    {CONTENT_LABEL[type]}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Tajuk *">
              <input
                className="input"
                placeholder={
                  cType === 'VIDEO' ? 'cth: Kuliah 1 — Pengenalan' :
                  cType === 'PDF' ? 'cth: Nota Bab 1' :
                  cType === 'TEXT' ? 'cth: Ringkasan Topik' :
                  'cth: Rujukan Tambahan'
                }
                value={cTitle}
                onChange={(e) => setCTitle(e.target.value)}
                autoFocus
              />
            </Field>

            {/* VIDEO */}
            {cType === 'VIDEO' && (
              <Field label="URL YouTube" hint="YouTube URL akan diembed secara automatik dalam halaman modul">
                <input className="input" placeholder="https://youtube.com/watch?v=..." value={cUrl} onChange={(e) => setCUrl(e.target.value)} />
              </Field>
            )}

            {/* PDF */}
            {cType === 'PDF' && (
              <Field label="Fail PDF (maks 10MB)">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    pdfFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  />
                  {pdfFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700 truncate max-w-[200px]">{pdfFile.name}</span>
                      <span className="text-xs text-green-500">({(pdfFile.size / 1024 / 1024).toFixed(1)}MB)</span>
                    </div>
                  ) : (
                    <div>
                      <UploadCloud className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Klik untuk pilih fail PDF</p>
                      <p className="text-xs text-gray-400 mt-1">atau seret dan lepas di sini</p>
                    </div>
                  )}
                </div>
                {uploadProgress === 'uploading' && (
                  <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Sedang memuat naik...
                  </p>
                )}
              </Field>
            )}

            {/* LINK */}
            {cType === 'LINK' && (
              <Field label="URL Pautan">
                <input className="input" placeholder="https://..." value={cUrl} onChange={(e) => setCUrl(e.target.value)} />
              </Field>
            )}

            {/* Description / catatan untuk VIDEO, PDF, LINK */}
            {cType !== 'TEXT' && (
              <Field label="Catatan untuk Pelajar (pilihan)" hint="Akan dipaparkan sebagai nota panduan bawah kandungan">
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder={
                    cType === 'VIDEO' ? 'cth: Tonton video ini sebelum kelas. Fokus pada bahagian 10:00–25:00.' :
                    cType === 'PDF' ? 'cth: Sila baca Bab 3–5. Akan ada soalan spot quiz.' :
                    'cth: Rujuk pautan ini untuk maklumat lanjut tentang topik.'
                  }
                  value={cDesc}
                  onChange={(e) => setCDesc(e.target.value)}
                />
              </Field>
            )}

            {/* NOTA - Rich Text Editor */}
            {cType === 'TEXT' && (
              <Field label="Kandungan Nota" hint="Akan dipaparkan terus dalam halaman modul pelajar">
                <RichTextEditor
                  key={editorKey}
                  onChange={setRichContent}
                  placeholder="Taip nota, ringkasan kuliah, petikan, atau arahan di sini..."
                />
              </Field>
            )}

            <ModalActions
              onCancel={() => setAddingContentTo(null)}
              onConfirm={handleAddContent}
              loading={loading}
              disabled={!cTitle.trim() || (cType === 'PDF' && !pdfFile)}
              label="Tambah Kandungan"
            />
          </div>
        </Modal>
      )}

      {deletingModuleId && (
        <Modal title="Padam Modul?" onClose={() => setDeletingModuleId(null)}>
          <p className="text-sm text-gray-600 mb-6">Modul dan semua kandungannya akan dipadam. Tindakan ini tidak boleh dibatalkan.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingModuleId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Batal</button>
            <button onClick={() => handleDeleteModule(deletingModuleId)} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Ya, Padam
            </button>
          </div>
        </Modal>
      )}

      {deletingContentId && (
        <Modal title="Padam Kandungan?" onClose={() => setDeletingContentId(null)}>
          <p className="text-sm text-gray-600 mb-6">Kandungan ini akan dipadam secara kekal.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingContentId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Batal</button>
            <button onClick={() => handleDeleteContent(deletingContentId)} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Ya, Padam
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function ModalActions({ onCancel, onConfirm, loading, disabled, label }: {
  onCancel: () => void; onConfirm: () => void; loading: boolean; disabled: boolean; label: string
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Batal</button>
      <button onClick={onConfirm} disabled={disabled || loading} className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {label}
      </button>
    </div>
  )
}
