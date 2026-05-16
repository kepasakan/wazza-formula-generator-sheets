'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Megaphone } from 'lucide-react'
import RichTextEditor from '@/components/RichTextEditor'

type Announcement = {
  id: string
  title: string
  isPublished: boolean
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
  const [form, setForm] = useState({ title: '', content: '', isPublished: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function startNew() {
    setForm({ title: '', content: '', isPublished: false })
    setEditingId(null)
    setError('')
    setView('form')
  }

  async function startEdit(a: Announcement) {
    const res = await fetch(`/api/announcements/${a.id}`)
    const data = await res.json()
    setForm({ title: data.title, content: data.content, isPublished: data.isPublished })
    setEditingId(a.id)
    setError('')
    setView('form')
  }

  function cancel() {
    setView('list')
    setEditingId(null)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content || form.content === '<p></p>') {
      setError('Kandungan hebahan diperlukan')
      return
    }
    setLoading(true)
    setError('')

    const method = editingId ? 'PUT' : 'POST'
    const url = editingId ? `/api/announcements/${editingId}` : '/api/announcements'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Ralat berlaku')
      return
    }

    if (editingId) {
      setAnnouncements(announcements.map(a => a.id === editingId ? data : a))
    } else {
      setAnnouncements([data, ...announcements])
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
      body: JSON.stringify({ title: full.title, content: full.content, isPublished: !a.isPublished }),
    })
    if (res.ok) {
      setAnnouncements(announcements.map(x => x.id === a.id ? { ...x, isPublished: !a.isPublished } : x))
    }
  }

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
                Terbitkan sekarang (pensyarah & pelajar boleh lihat)
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#0d9488' }}
            >
              {loading ? 'Menyimpan...' : editingId ? 'Kemaskini' : 'Simpan Hebahan'}
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
