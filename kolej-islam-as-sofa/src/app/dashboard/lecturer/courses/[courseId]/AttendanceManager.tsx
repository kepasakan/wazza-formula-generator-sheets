'use client'

import { useState, useEffect, useRef } from 'react'
import {
  CalendarCheck, Plus, X, Loader2, Users, Clock,
  CheckCircle, XCircle, ExternalLink,
} from 'lucide-react'

type AttendanceRecord = {
  id: string
  student: { id: string; name: string; matricNo: string | null }
  markedAt: string
  status: string
}

type Session = {
  id: string
  title: string
  date: string
  code: string
  isOpen: boolean
  expiresAt: string | null
  records: AttendanceRecord[]
  _count: { records: number }
}

type EnrolledStudent = {
  student: { id: string; name: string; matricNo: string | null }
}

type ActiveSessionData = Session & {
  course: { enrollments: EnrolledStudent[] }
}

type Student = { id: string; name: string; matricNo: string | null }

type Props = {
  courseId: string
  initialSessions: Session[]
  totalEnrolled: number
  enrolledStudents: Student[]
}

export default function AttendanceManager({ courseId, initialSessions, totalEnrolled, enrolledStudents }: Props) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null)
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Session form state
  const [sessionTitle, setSessionTitle] = useState('')
  const [duration, setDuration] = useState('10')

  // Poll active session every 5 seconds
  useEffect(() => {
    if (!activeSession) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/attendance/sessions/${activeSession.id}`)
        if (!res.ok) return
        const data = await res.json()
        setActiveSession(data)
        if (!data.isOpen) {
          setSessions((prev) => prev.map((s) => (s.id === data.id ? { ...data, _count: { records: data.records.length } } : s)))
          setActiveSession(null)
        }
      } catch { /* silent */ }
    }

    pollRef.current = setInterval(poll, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeSession?.id])

  // Countdown timer
  useEffect(() => {
    if (!activeSession?.expiresAt) { setTimeLeft(null); return }
    const tick = () => {
      const left = Math.max(0, new Date(activeSession.expiresAt!).getTime() - Date.now())
      setTimeLeft(left)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeSession?.expiresAt])

  const formatTime = (ms: number) => {
    const total = Math.floor(ms / 1000)
    const m = Math.floor(total / 60).toString().padStart(2, '0')
    const s = (total % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const openModal = () => {
    setSessionTitle('')
    setDuration('10')
    setShowOpenModal(true)
  }

  const handleOpenSession = async () => {
    if (!sessionTitle.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/attendance/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sessionTitle.trim(),
          durationMinutes: duration === '0' ? null : Number(duration),
        }),
      })
      if (!res.ok) throw new Error()
      const newSession = await res.json()
      setSessions((prev) => [{ ...newSession, records: [], _count: { records: 0 } }, ...prev])
      setShowOpenModal(false)
      // Fetch full session data for active view
      const fullRes = await fetch(`/api/attendance/sessions/${newSession.id}`)
      const fullData = await fullRes.json()
      setActiveSession(fullData)
    } catch {
      alert('Gagal membuka sesi kehadiran.')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseSession = async () => {
    if (!activeSession) return
    try {
      await fetch(`/api/attendance/sessions/${activeSession.id}`, { method: 'PUT' })
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, isOpen: false, _count: { records: activeSession.records.length } }
            : s
        )
      )
      setActiveSession(null)
    } catch {
      alert('Gagal menutup sesi.')
    }
  }

  const markedIds = new Set(activeSession?.records.map((r) => r.student.id) ?? [])
  const notMarked = (activeSession?.course.enrollments ?? []).filter(
    (e) => !markedIds.has(e.student.id)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-green-700" />
          Kehadiran
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {sessions.length} sesi
          </span>
        </h3>
        {!activeSession && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition font-medium"
          >
            <Plus className="w-4 h-4" />
            Buka Sesi
          </button>
        )}
      </div>

      {/* Active session panel */}
      {activeSession && (
        <div className="bg-green-700 rounded-2xl p-6 mb-5 text-white">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-green-200 text-xs font-medium mb-0.5">Sesi Aktif</p>
              <h4 className="text-lg font-bold">{activeSession.title}</h4>
            </div>
            <div className="text-right">
              {timeLeft !== null ? (
                <div className={`text-2xl font-mono font-bold ${timeLeft < 60000 ? 'text-red-300 animate-pulse' : 'text-white'}`}>
                  {formatTime(timeLeft)}
                </div>
              ) : (
                <span className="text-xs text-green-200">Tiada masa tamat</span>
              )}
            </div>
          </div>

          {/* Big code */}
          <div className="bg-white/10 rounded-2xl p-6 text-center mb-5">
            <p className="text-green-200 text-sm mb-2">Kod Kehadiran</p>
            <p className="text-6xl font-mono font-bold tracking-[0.3em] text-white">
              {activeSession.code}
            </p>
            <p className="text-green-300 text-xs mt-3">
              Tunjukkan kod ini kepada pelajar
            </p>
          </div>

          {/* Live count */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{activeSession.records.length}</p>
              <p className="text-xs text-green-200 mt-0.5">Sudah Hadir</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{notMarked.length}</p>
              <p className="text-xs text-green-200 mt-0.5">Belum Mark</p>
            </div>
          </div>

          {/* Who's marked */}
          {activeSession.records.length > 0 && (
            <div className="bg-white/10 rounded-xl p-3 mb-4 max-h-40 overflow-y-auto space-y-1.5">
              {activeSession.records.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-3.5 h-3.5 text-green-300 flex-shrink-0" />
                  <span className="text-white">{r.student.name}</span>
                  <span className="text-green-300 text-xs ml-auto">
                    {new Date(r.markedAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleCloseSession}
            className="w-full py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white text-sm font-medium transition flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Tutup Sesi Kehadiran
          </button>
        </div>
      )}

      {/* Past sessions */}
      {sessions.filter((s) => !s.isOpen).length === 0 && !activeSession ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
          <CalendarCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Belum ada sesi kehadiran</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.filter((s) => !s.isOpen).map((s) => {
            const pct = totalEnrolled > 0 ? Math.round((s._count.records / totalEnrolled) * 100) : 0
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(s.date).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                    {' · '}
                    {new Date(s.date).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="font-medium text-green-700">{s._count.records}</span>
                    <XCircle className="w-3.5 h-3.5 text-red-400 ml-1" />
                    <span className="font-medium text-red-600">{totalEnrolled - s._count.records}</span>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className={`text-sm font-bold ${pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                      {pct}%
                    </p>
                  </div>
                  <a
                    href={`/dashboard/lecturer/courses/${courseId}/attendance/${s.id}`}
                    className="flex items-center gap-1.5 text-xs text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Lihat Rekod
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Open session modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Buka Sesi Kehadiran</h3>
              <button onClick={() => setShowOpenModal(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Nama Sesi *</label>
                <input
                  className="input"
                  placeholder="cth: Kuliah Minggu 3 — Isnin"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenSession()}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Tempoh Kod Aktif</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '5 minit', value: '5' },
                    { label: '10 minit', value: '10' },
                    { label: '15 minit', value: '15' },
                    { label: '20 minit', value: '20' },
                    { label: '30 minit', value: '30' },
                    { label: 'Manual', value: '0' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDuration(opt.value)}
                      className={`py-2 px-3 rounded-xl border-2 text-xs font-medium transition-all ${
                        duration === opt.value
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {duration === '0' && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Sesi perlu ditutup secara manual
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowOpenModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Batal</button>
                <button
                  onClick={handleOpenSession}
                  disabled={!sessionTitle.trim() || loading}
                  className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Users className="w-4 h-4" />
                  Buka Sesi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
