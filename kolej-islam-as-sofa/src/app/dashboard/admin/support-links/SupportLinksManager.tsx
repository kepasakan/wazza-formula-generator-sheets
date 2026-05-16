'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, ExternalLink, X, Check } from 'lucide-react'

type SupportLink = {
  id: string
  title: string
  url: string
  description: string | null
  category: string | null
  isActive: boolean
}

type Props = {
  initialLinks: SupportLink[]
}

export default function SupportLinksManager({ initialLinks }: Props) {
  const [links, setLinks] = useState(initialLinks)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', url: '', description: '', category: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function resetForm() {
    setForm({ title: '', url: '', description: '', category: '' })
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  function startEdit(link: SupportLink) {
    setForm({
      title: link.title,
      url: link.url,
      description: link.description ?? '',
      category: link.category ?? '',
    })
    setEditingId(link.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const method = editingId ? 'PUT' : 'POST'
    const url = editingId ? `/api/support-links/${editingId}` : '/api/support-links'

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
      setLinks(links.map(l => (l.id === editingId ? data : l)))
    } else {
      setLinks([...links, data])
    }
    resetForm()
  }

  async function handleDelete(id: string) {
    if (!confirm('Padam pautan ini?')) return
    const res = await fetch(`/api/support-links/${id}`, { method: 'DELETE' })
    if (res.ok) setLinks(links.filter(l => l.id !== id))
  }

  const categories = [...new Set(links.map(l => l.category).filter(Boolean))] as string[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pautan Bantuan</h2>
          <p className="text-gray-500 text-sm mt-1">{links.length} pautan diurus</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: '', url: '', description: '', category: '' }) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
          style={{ backgroundColor: '#0d9488' }}
        >
          <Plus className="w-4 h-4" />
          Tambah Pautan
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Pautan' : 'Pautan Baru'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tajuk <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="cth: Borang Cuti Sakit"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  placeholder="cth: Borang, Permohonan, Maklumat"
                  list="categories"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <datalist id="categories">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL / Pautan <span className="text-red-500">*</span></label>
              <input
                type="url"
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Huraian ringkas pautan ini..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#0d9488' }}
              >
                <Check className="w-4 h-4" />
                {loading ? 'Menyimpan...' : editingId ? 'Kemaskini' : 'Simpan'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {links.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-400 text-sm">Tiada pautan lagi. Tambah pautan pertama.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {links.map(link => (
              <div key={link.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{link.title}</p>
                    {link.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
                        {link.category}
                      </span>
                    )}
                  </div>
                  {link.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{link.description}</p>}
                  <p className="text-xs text-blue-500 truncate mt-0.5">{link.url}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => startEdit(link)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
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
