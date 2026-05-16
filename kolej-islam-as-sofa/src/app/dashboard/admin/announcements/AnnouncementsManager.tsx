'use client'

import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Megaphone, UploadCloud, ImageIcon, Loader2 } from 'lucide-react'
import RichTextEditor from '@/components/RichTextEditor'
import Image from 'next/image'

type Announcement = {
  id: string
  title: string
  isPublished: boolean
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

type Props = {
  initialAnnouncements: Announcement[]
}

export default function AnnouncementsManager({ initialAnnouncements }: Props) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', content: '', isPublished: false, imageUrl: null as string | null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [removeImage, setRemoveImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function startNew() {
    setForm({ title: '', content: '', isPublished: false, imageUrl: null })
    setEditingId(null)
    setError('')
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(false)
    setView('form')
  }

  async function startEdit(a: Announcement) {
    const res = await fetch(`/api/announcements/${a.id}`)
    const data = await res.json()
    setForm({ title: data.title, content: data.content, isPublished: data.isPublished, imageUrl: data.imageUrl ?? null })
    setEditingId(a.id)
    setError('')
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(false)
    setView('form')
  }

  function cancel() {
    setView('list')
    setEditingId(null)
    setError('')
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(false)
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setRemoveImage(false)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleRemoveImage() {
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content || form.content === '<p></p>') {
      setError('Kandungan hebahan diperlukan')
      return
    }
    setLoading(true)
    setError('')

    let finalImageUrl: string | null = form.imageUrl

    // Upload new image if picked
    if (imageFile) {
      setUploadingImage(true)
      try {
        const fd = new FormData()
        fd.append('file', imageFile)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!uploadRes.ok) throw new Error('Upload gagal')
        const { url } = await uploadRes.json()
        finalImageUrl = url
      } catch {
        setError('Gagal memuat naik gambar. Cuba lagi.')
        setLoading(false)
        setUploadingImage(false)
        return
      }
      setUploadingImage(false)
    } else if (removeImage) {
      finalImageUrl = null
    }

    const method = editingId ? 'PUT' : 'POST'
    const url = editingId ? `/api/announcements/${editingId}` : '/api/announcements'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, imageUrl: finalImageUrl }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Ralat berlaku')
      return
    }

    if (editingId) {
      setAnnouncements(announcements.map(a => a.id === editingId ? { ...data, imageUrl: data.imageUrl ?? null } : a))
    } else {
      setAnnouncements([{ ...data, imageUrl: data.imageUrl ?? null }, ...announcements])
    }
    cancel()
  }

  async function handleDelete(id: string) {
    if (!confirm('Padam hebahan ini?')) return
    const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
    if (res.ok) setAnnouncements(announcements.filter(a => a.id !== id))
  }

  async function togglePublish(a: Announcement) {
    const full = await fetch(`/api/announcements/${a.id}`).then(r => r.json())
    const res = await fetch(`/api/announcements/${a.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: full.title, content: full.content, isPublished: !a.isPublished, imageUrl: full.imageUrl ?? null }),
    })
    if (res.ok) {
      setAnnouncements(announcements.map(x => x.id === a.id ? { ...x, isPublished: !a.isPublished } : x))
    }
  }

  const currentImage = imagePreview ?? (removeImage ? null : form.imageUrl)

  if (view === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingId ? 'Edit Hebahan' : 'Hebahan Baru'}
          </h2>
          <button onClick={cancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tajuk <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Tajuk hebahan..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gambar / Poster <span className="text-gray-400 font-normal">(pilihan)</span>
              </label>
              {currentImage ? (
                <div className="relative">
                  <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style={{ maxHeight: 320 }}>
                    <Image
                      src={currentImage}
                      alt="Preview"
                      width={800}
                      height={320}
                      className="w-full object-contain"
                      style={{ maxHeight: 320 }}
                      unoptimized
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ganti gambar
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Buang gambar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Klik untuk muat naik gambar atau poster</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — disarankan saiz banner (e.g. 1200×400)</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImagePick}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kandungan <span className="text-red-500">*</span></label>
              <RichTextEditor
                onChange={html => setForm(f => ({ ...f, content: html }))}
                placeholder="Tulis kandungan hebahan di sini..."
                initialContent={form.content}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublished"
                checked={form.isPublished}
                onChange={e => setForm({ ...form, isPublished: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="isPublished" className="text-sm text-gray-700">
                Terbitkan sekarang (pensyarah &amp; pelajar boleh lihat)
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#0d9488' }}
            >
              {(loading || uploadingImage) && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploadingImage ? 'Memuat naik gambar...' : loading ? 'Menyimpan...' : editingId ? 'Kemaskini' : 'Simpan Hebahan'}
            </button>
            <button type="button" onClick={cancel} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
              Batal
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hebahan</h2>
          <p className="text-gray-500 text-sm mt-1">{announcements.length} hebahan</p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#0d9488' }}
        >
          <Plus className="w-4 h-4" />
          Hebahan Baru
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
          <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Tiada hebahan lagi</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {announcements.map(a => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                {a.imageUrl ? (
                  <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                    <Image src={a.imageUrl} alt="" width={56} height={40} className="w-full h-full object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="w-14 h-10 rounded-lg flex-shrink-0 bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      a.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {a.isPublished ? 'Diterbitkan' : 'Draf'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(a.createdAt).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => togglePublish(a)}
                    title={a.isPublished ? 'Sembunyikan' : 'Terbitkan'}
                    className={`p-1.5 rounded-md transition-colors ${
                      a.isPublished
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {a.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => startEdit(a)} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
