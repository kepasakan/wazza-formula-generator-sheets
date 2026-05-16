'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, BookMarked, Building2 } from 'lucide-react'

type Course = { id: string; title: string; code: string; departmentId: string | null }
type Department = { id: string; name: string; code: string | null; _count: { courses: number } }

type Props = {
  initialDepts: Department[]
  allCourses: Course[]
}

export default function DepartmentsManager({ initialDepts, allCourses }: Props) {
  const [depts, setDepts] = useState(initialDepts)
  const [courses, setCourses] = useState(allCourses)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', code: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [assigningDeptId, setAssigningDeptId] = useState<string | null>(null)

  function resetForm() {
    setForm({ name: '', code: '' })
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  function startEdit(d: Department) {
    setForm({ name: d.name, code: d.code ?? '' })
    setEditingId(d.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const method = editingId ? 'PUT' : 'POST'
    const url = editingId ? `/api/departments/${editingId}` : '/api/departments'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? 'Ralat berlaku'); return }

    if (editingId) {
      setDepts(depts.map(d => d.id === editingId ? data : d))
    } else {
      setDepts([...depts, data])
    }
    resetForm()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Padam bidang "${name}"? Semua kursus dalam bidang ini akan dikeluarkan dari bidang.`)) return
    const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDepts(depts.filter(d => d.id !== id))
      setCourses(courses.map(c => c.departmentId === id ? { ...c, departmentId: null } : c))
    }
  }

  async function assignCourse(courseId: string, departmentId: string | null) {
    const res = await fetch(`/api/admin/courses/${courseId}/department`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departmentId }),
    })
    if (res.ok) {
      setCourses(courses.map(c => c.id === courseId ? { ...c, departmentId } : c))
      setDepts(depts.map(d => {
        const prev = courses.find(c => c.id === courseId)?.departmentId
        if (d.id === departmentId) return { ...d, _count: { courses: d._count.courses + 1 } }
        if (d.id === prev) return { ...d, _count: { courses: d._count.courses - 1 } }
        return d
      }))
    }
  }

  const unassigned = courses.filter(c => !c.departmentId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bidang</h2>
          <p className="text-gray-500 text-sm mt-1">{depts.length} bidang · {courses.length} kursus</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', code: '' }) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#0d9488' }}
        >
          <Plus className="w-4 h-4" />
          Bidang Baru
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Bidang' : 'Bidang Baru'}</h3>
            <button onClick={resetForm}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bidang <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="cth: Bidang Quran Sunnah" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="w-36">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kod</label>
              <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder="cth: QS"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            {error && <p className="text-sm text-red-600 self-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 flex-shrink-0"
              style={{ backgroundColor: '#0d9488' }}>
              <Check className="w-4 h-4" />
              {loading ? 'Simpan...' : editingId ? 'Kemaskini' : 'Simpan'}
            </button>
            <button type="button" onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 flex-shrink-0">
              Batal
            </button>
          </form>
        </div>
      )}

      {/* Departments list */}
      {depts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Tiada bidang lagi. Tambah bidang pertama.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {depts.map(dept => {
            const deptCourses = courses.filter(c => c.departmentId === dept.id)
            const isAssigning = assigningDeptId === dept.id

            return (
              <div key={dept.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f7f6' }}>
                    <Building2 className="w-5 h-5" style={{ color: '#0d9488' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{dept.name}</p>
                      {dept.code && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">{dept.code}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{dept._count.courses} kursus</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setAssigningDeptId(isAssigning ? null : dept.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isAssigning ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      <BookMarked className="w-3.5 h-3.5" />
                      {isAssigning ? 'Tutup' : 'Urus Kursus'}
                    </button>
                    <button onClick={() => startEdit(dept)} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(dept.id, dept.name)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Course assignment panel */}
                {isAssigning && (
                  <div className="px-6 py-4 bg-gray-50 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kursus dalam bidang ini</p>

                    {deptCourses.length === 0 ? (
                      <p className="text-sm text-gray-400">Tiada kursus lagi</p>
                    ) : (
                      <div className="space-y-1.5">
                        {deptCourses.map(c => (
                          <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-200">
                            <div>
                              <span className="text-xs font-mono text-gray-500 mr-2">{c.code}</span>
                              <span className="text-sm text-gray-800">{c.title}</span>
                            </div>
                            <button onClick={() => assignCourse(c.id, null)}
                              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                              <X className="w-3.5 h-3.5" /> Keluarkan
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {unassigned.length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Tambah kursus</p>
                        <div className="space-y-1.5">
                          {unassigned.map(c => (
                            <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-dashed border-gray-300">
                              <div>
                                <span className="text-xs font-mono text-gray-500 mr-2">{c.code}</span>
                                <span className="text-sm text-gray-600">{c.title}</span>
                              </div>
                              <button onClick={() => assignCourse(c.id, dept.id)}
                                className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1 font-medium">
                                <Plus className="w-3.5 h-3.5" /> Tambah
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Course chips (collapsed view) */}
                {!isAssigning && deptCourses.length > 0 && (
                  <div className="px-6 py-3 flex flex-wrap gap-2">
                    {deptCourses.map(c => (
                      <span key={c.id} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-mono">
                        {c.code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Unassigned courses */}
      {unassigned.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="font-semibold text-gray-700 text-sm">Kursus Tanpa Bidang <span className="text-gray-400 font-normal">({unassigned.length})</span></p>
          </div>
          <div className="px-6 py-3 flex flex-wrap gap-2">
            {unassigned.map(c => (
              <span key={c.id} className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-mono border border-orange-200">
                {c.code} — {c.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
