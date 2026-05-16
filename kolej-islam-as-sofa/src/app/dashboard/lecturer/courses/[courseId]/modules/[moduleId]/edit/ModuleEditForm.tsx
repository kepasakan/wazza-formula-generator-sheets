'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Plus, Trash2, Play, FileText, AlignLeft, Link2, UploadCloud, Save, Pencil, X, Check,
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

type Props = {
  courseId: string
  module: {
    id: string
    title: string
    description: string | null
    contents: ModuleContent[]
  }
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

type EditState = {
  id: string
  title: string
  url: string
  richContent: string
  desc: string
  saving: boolean
  editorKey: number
}

export default function ModuleEditForm({ courseId, module: initialModule }: Props) {
  const router = useRouter()

  // Module info
  const [title, setTitle] = useState(initialModule.title)
  const [description, setDescription] = useState(initialModule.description ?? '')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoSaved, setInfoSaved] = useState(false)

  // Content list
  const [contents, setContents] = useState<ModuleContent[]>(initialModule.contents)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Inline edit state
  const [editState, setEditState] = useState<EditState | null>(null)

  // Add content form
  const [showAddForm, setShowAddForm] = useState(false)
  const [cType, setCType] = useState<ContentType>('VIDEO')
  const [cTitle, setCTitle] = useState('')
  const [cUrl, setCUrl] = useState('')
  const [richContent, setRichContent] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [addingContent, setAddingContent] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null)
  const [editUploadProgress, setEditUploadProgress] = useState<'idle' | 'uploading' | 'done'>('idle')

  // --- Save module info ---
  const handleSaveInfo = async () => {
    if (!title.trim() || savingInfo) return
    setSavingInfo(true)
    try {
      const res = await fetch(`/api/modules/${initialModule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      })
      if (!res.ok) throw new Error()
      setInfoSaved(true)
      setTimeout(() => setInfoSaved(false), 2000)
    } catch {
      alert('Gagal menyimpan. Cuba lagi.')
    } finally {
      setSavingInfo(false)
    }
  }

  // --- Open inline edit ---
  const openEdit = (c: ModuleContent) => {
    setEditState({
      id: c.id,
      title: c.title,
      url: c.youtubeId
        ? `https://youtube.com/watch?v=${c.youtubeId}`
        : (c.contentUrl ?? ''),
      richContent: c.type === 'TEXT' ? (c.textContent ?? '') : '',
      desc: c.type !== 'TEXT' ? (c.textContent ?? '') : '',
      saving: false,
      editorKey: Date.now(),
    })
    setEditPdfFile(null)
    setEditUploadProgress('idle')
    setDeletingId(null)
  }

  // --- Save inline edit ---
  const handleSaveEdit = async (c: ModuleContent) => {
    if (!editState || editState.saving) return
    setEditState((prev) => prev && { ...prev, saving: true })
    try {
      let youtubeId: string | null = c.youtubeId
      let finalUrl: string | null = c.contentUrl

      if (c.type === 'VIDEO' && editState.url.trim()) {
        const match = editState.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
        if (match) { youtubeId = match[1]; finalUrl = null }
        else { youtubeId = null; finalUrl = editState.url.trim() || null }
      }

      if (c.type === 'PDF' && editPdfFile) {
        setEditUploadProgress('uploading')
        const form = new FormData()
        form.append('file', editPdfFile)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: form })
        if (!uploadRes.ok) throw new Error('Upload gagal')
        const { url } = await uploadRes.json()
        finalUrl = url
        youtubeId = null
        setEditUploadProgress('done')
      }

      if (c.type === 'LINK') {
        finalUrl = editState.url.trim() || null
        youtubeId = null
      }

      const res = await fetch(`/api/contents/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editState.title.trim(),
          contentUrl: finalUrl,
          youtubeId,
          textContent: c.type === 'TEXT' ? (editState.richContent || null) : (editState.desc.trim() || null),
        }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setContents((prev) => prev.map((item) => item.id === c.id ? {
        ...item,
        title: updated.title,
        contentUrl: updated.contentUrl,
        youtubeId: updated.youtubeId,
        textContent: updated.textContent,
      } : item))
      setEditState(null)
      setEditPdfFile(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan kandungan.')
      setEditUploadProgress('idle')
    } finally {
      setEditState((prev) => prev && { ...prev, saving: false })
    }
  }

  // --- Delete content ---
  const handleDeleteContent = async (contentId: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/contents/${contentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setContents((prev) => prev.filter((c) => c.id !== contentId))
      setDeletingId(null)
    } catch {
      alert('Gagal memadam kandungan.')
    } finally {
      setDeleting(false)
    }
  }

  // --- Add content ---
  const resetAddForm = () => {
    setCType('VIDEO'); setCTitle(''); setCUrl(''); setRichContent('')
    setCDesc(''); setPdfFile(null); setUploadProgress('idle'); setEditorKey((k) => k + 1)
  }

  const handleAddContent = async () => {
    if (!cTitle.trim() || addingContent) return
    setAddingContent(true)
    try {
      let youtubeId: string | null = null
      let finalUrl: string | null = cUrl.trim() || null

      if (cType === 'VIDEO' && cUrl.trim()) {
        const match = cUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
        if (match) { youtubeId = match[1]; finalUrl = null }
      }
      if (cType === 'PDF') {
        if (!pdfFile) { alert('Sila pilih fail PDF.'); setAddingContent(false); return }
        setUploadProgress('uploading')
        const form = new FormData()
        form.append('file', pdfFile)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: form })
        if (!uploadRes.ok) throw new Error('Upload gagal')
        const { url } = await uploadRes.json()
        finalUrl = url
        setUploadProgress('done')
      }
      const res = await fetch(`/api/modules/${initialModule.id}/contents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: cType, title: cTitle.trim(), contentUrl: finalUrl, youtubeId,
          textContent: cType === 'TEXT' ? (richContent || null) : (cDesc.trim() || null),
        }),
      })
      if (!res.ok) throw new Error()
      const content = await res.json()
      setContents((prev) => [...prev, content])
      resetAddForm(); setShowAddForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menambah kandungan.')
      setUploadProgress('idle')
    } finally {
      setAddingContent(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Module info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-900">Maklumat Modul</h3>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Tajuk Modul *</label>
          <input className="input w-full" value={title} onChange={(e) => { setTitle(e.target.value); setInfoSaved(false) }} autoFocus />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Penerangan Modul <span className="font-normal text-gray-400">(pilihan)</span>
          </label>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <RichTextEditor
              key="desc-editor"
              initialContent={initialModule.description ?? ''}
              onChange={(v) => { setDescription(v); setInfoSaved(false) }}
              placeholder="Huraikan kandungan dan objektif modul ini..."
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSaveInfo}
            disabled={!title.trim() || savingInfo}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-800 transition disabled:opacity-50"
          >
            {savingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {infoSaved ? 'Disimpan!' : 'Simpan Maklumat'}
          </button>
        </div>
      </div>

      {/* Content management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Kandungan Modul
            <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {contents.length} item
            </span>
          </h3>
          {!showAddForm && (
            <button
              onClick={() => { resetAddForm(); setShowAddForm(true); setEditState(null) }}
              className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition font-medium"
            >
              <Plus className="w-4 h-4" /> Tambah Kandungan
            </button>
          )}
        </div>

        {contents.length === 0 && !showAddForm && (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
            <p className="text-gray-400 text-sm">Belum ada kandungan. Klik &quot;Tambah Kandungan&quot; untuk mula.</p>
          </div>
        )}

        {contents.length > 0 && (
          <div className="space-y-3">
            {contents.map((c, idx) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Row header */}
                <div className="flex items-center gap-3 px-5 py-3.5">
                  <span className="text-xs text-gray-300 font-bold w-4 text-center flex-shrink-0">{idx + 1}</span>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${CONTENT_COLOR[c.type]}`}>
                    {CONTENT_ICON[c.type]}
                    <span>{CONTENT_LABEL[c.type]}</span>
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-700">{c.title}</span>
                  {(c.youtubeId || c.contentUrl) && editState?.id !== c.id && (
                    <a
                      href={c.youtubeId ? `https://youtube.com/watch?v=${c.youtubeId}` : c.contentUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex-shrink-0"
                    >
                      Buka
                    </a>
                  )}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {editState?.id === c.id ? (
                      <button
                        onClick={() => setEditState(null)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => { openEdit(c); setShowAddForm(false) }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {deletingId === c.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteContent(c.id)}
                          disabled={deleting}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setDeletingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(c.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline edit form */}
                {editState?.id === c.id && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50">
                    {/* Title */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Tajuk</label>
                      <input
                        className="input w-full"
                        value={editState.title}
                        onChange={(e) => setEditState((prev) => prev && { ...prev, title: e.target.value })}
                        autoFocus
                      />
                    </div>

                    {/* VIDEO url */}
                    {c.type === 'VIDEO' && (
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">URL YouTube</label>
                        <input
                          className="input w-full"
                          placeholder="https://youtube.com/watch?v=..."
                          value={editState.url}
                          onChange={(e) => setEditState((prev) => prev && { ...prev, url: e.target.value })}
                        />
                      </div>
                    )}

                    {/* PDF — replace file */}
                    {c.type === 'PDF' && (
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Fail PDF
                        </label>
                        {c.contentUrl && (
                          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                            <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span className="text-xs text-gray-500 flex-shrink-0">Fail semasa:</span>
                            <a
                              href={c.contentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline truncate"
                            >
                              {decodeURIComponent(c.contentUrl.split('/').pop() ?? 'fail.pdf')}
                            </a>
                          </div>
                        )}
                        <div
                          onClick={() => editFileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${editPdfFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(e) => setEditPdfFile(e.target.files?.[0] ?? null)}
                          />
                          {editPdfFile
                            ? <span className="text-sm text-green-700 font-medium">{editPdfFile.name}</span>
                            : <span className="text-sm text-gray-400">Klik untuk ganti dengan fail PDF baru</span>
                          }
                        </div>
                        {editUploadProgress === 'uploading' && (
                          <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Memuat naik...
                          </p>
                        )}
                      </div>
                    )}

                    {/* LINK url */}
                    {c.type === 'LINK' && (
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">URL Pautan</label>
                        <input
                          className="input w-full"
                          placeholder="https://..."
                          value={editState.url}
                          onChange={(e) => setEditState((prev) => prev && { ...prev, url: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Catatan for VIDEO/PDF/LINK */}
                    {c.type !== 'TEXT' && (
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Catatan untuk Pelajar <span className="font-normal text-gray-400">(pilihan)</span>
                        </label>
                        <textarea
                          className="input resize-none w-full"
                          rows={3}
                          value={editState.desc}
                          onChange={(e) => setEditState((prev) => prev && { ...prev, desc: e.target.value })}
                          placeholder="Arahan atau nota tambahan..."
                        />
                      </div>
                    )}

                    {/* TEXT — TipTap */}
                    {c.type === 'TEXT' && (
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Kandungan Nota</label>
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white min-h-[250px]">
                          <RichTextEditor
                            key={editState.editorKey}
                            initialContent={editState.richContent}
                            onChange={(v) => setEditState((prev) => prev && { ...prev, richContent: v })}
                            placeholder="Edit kandungan nota di sini..."
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setEditState(null)}
                        className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white transition"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleSaveEdit(c)}
                        disabled={!editState.title.trim() || editState.saving}
                        className="flex-1 py-2 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {editState.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Simpan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add content form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Kandungan Baharu</h4>
              <button onClick={() => { setShowAddForm(false); resetAddForm() }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Jenis Kandungan</label>
              <div className="grid grid-cols-4 gap-2">
                {(['VIDEO', 'PDF', 'TEXT', 'LINK'] as ContentType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setCType(type); setPdfFile(null); setCUrl(''); setCDesc(''); setRichContent(''); setEditorKey((k) => k + 1) }}
                    className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 text-xs font-medium transition-all ${cType === type ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <span className={`${CONTENT_COLOR[type]} p-2 rounded-lg`}>{CONTENT_ICON[type]}</span>
                    {CONTENT_LABEL[type]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Tajuk *</label>
              <input className="input w-full" placeholder={cType === 'VIDEO' ? 'cth: Kuliah 1 — Pengenalan' : cType === 'PDF' ? 'cth: Nota Bab 1' : cType === 'TEXT' ? 'cth: Ringkasan Topik' : 'cth: Rujukan Tambahan'} value={cTitle} onChange={(e) => setCTitle(e.target.value)} />
            </div>

            {cType === 'VIDEO' && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">URL YouTube</label>
                <input className="input w-full" placeholder="https://youtube.com/watch?v=..." value={cUrl} onChange={(e) => setCUrl(e.target.value)} />
              </div>
            )}

            {cType === 'PDF' && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Fail PDF (maks 10MB)</label>
                <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${pdfFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
                  {pdfFile ? <span className="text-sm font-medium text-green-700">{pdfFile.name}</span> : <div><UploadCloud className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-500">Klik untuk pilih fail PDF</p></div>}
                </div>
                {uploadProgress === 'uploading' && <p className="text-xs text-blue-500 mt-2 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Sedang memuat naik...</p>}
              </div>
            )}

            {cType === 'LINK' && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">URL Pautan</label>
                <input className="input w-full" placeholder="https://..." value={cUrl} onChange={(e) => setCUrl(e.target.value)} />
              </div>
            )}

            {cType !== 'TEXT' && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Catatan untuk Pelajar <span className="font-normal text-gray-400">(pilihan)</span></label>
                <textarea className="input resize-none w-full" rows={3} placeholder="Arahan atau nota tambahan..." value={cDesc} onChange={(e) => setCDesc(e.target.value)} />
              </div>
            )}

            {cType === 'TEXT' && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Kandungan Nota</label>
                <p className="text-xs text-gray-400 mb-2">Akan dipaparkan terus dalam halaman modul pelajar</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden min-h-[300px]">
                  <RichTextEditor key={editorKey} onChange={setRichContent} placeholder="Taip nota, ringkasan kuliah, petikan, atau arahan di sini..." />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => { setShowAddForm(false); resetAddForm() }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">Batal</button>
              <button onClick={handleAddContent} disabled={!cTitle.trim() || (cType === 'PDF' && !pdfFile) || addingContent} className="flex-1 py-2.5 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {addingContent && <Loader2 className="w-4 h-4 animate-spin" />}
                Tambah Kandungan
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-2">
        <button onClick={() => { router.push(`/dashboard/lecturer/courses/${courseId}`); router.refresh() }} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← Kembali ke kursus
        </button>
      </div>
    </div>
  )
}
