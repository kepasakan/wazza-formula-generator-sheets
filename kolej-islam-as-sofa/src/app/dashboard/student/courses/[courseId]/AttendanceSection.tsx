'use client'

import { useState, useEffect } from 'react'
import { CalendarCheck, CheckCircle, XCircle, Clock, Loader2, RefreshCw, AlertCircle } from 'lucide-react'

type ActiveSession = {
  id: string
  title: string
  expiresAt: string | null
  alreadyMarked: boolean
}

type SessionRecord = {
  id: string
  title: string
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null
}

type Props = {
  courseId: string
  initialActive: ActiveSession | null
  initialHistory: SessionRecord[]
}

export default function AttendanceSection({ courseId, initialActive, initialHistory }: Props) {
  const [active, setActive] = useState<ActiveSession | null>(initialActive)
  const [history] = useState<SessionRecord[]>(initialHistory)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [marked, setMarked] = useState(initialActive?.alreadyMarked ?? false)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // Countdown for active session
  useEffect(() => {
    if (!active?.expiresAt) { setTimeLeft(null); return }
    const tick = () => setTimeLeft(Math.max(0, new Date(active.expiresAt!).getTime() - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [active?.expiresAt])

  const formatTime = (ms: number) => {
    const total = Math.floor(ms / 1000)
    const m = Math.floor(total / 60).toString().padStart(2, '0')
    const s = (total % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const checkActive = async () => {
    setChecking(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/attendance/active`)
      const data = await res.json()
      setActive(data)
      setMarked(data?.alreadyMarked ?? false)
      setError(null)
      setCode('')
    } catch { /* silent */ } finally {
      setChecking(false)
    }
  }

  const handleMark = async () => {
    if (!code.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Ralat semasa merekod kehadiran.')
        return
      }
      setMarked(true)
      setCode('')
    } catch {
      setError('Ralat rangkaian. Cuba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const present = history.filter((h) => h.status === 'PRESENT').length
  const pct = history.length > 0 ? Math.round((present / history.length) * 100) : 0

  return (
    <div>
      <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
        <CalendarCheck className="w-5 h-5 text-gray-400" />
        Kehadiran
      </h3>

      {/* Active session banner */}
      {active && !marked && (
        <div className="bg-green-700 rounded-2xl p-5 mb-5 text-white">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-green-200 text-xs font-medium mb-0.5">Sesi Aktif Sekarang</p>
              <p className="font-semibold">{active.title}</p>
            </div>
            {timeLeft !== null && (
              <div className={`text-right font-mono font-bold text-lg flex-shrink-0 ${timeLeft < 60000 ? 'text-red-300 animate-pulse' : ''}`}>
                <Clock className="w-3.5 h-3.5 inline mr-1 opacity-70" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white/20 placeholder-green-200 text-white border border-white/30 rounded-xl px-4 py-2.5 text-lg font-mono tracking-widest focus:outline-none focus:bg-white/30 transition text-center"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleMark()}
            />
            <button
              onClick={handleMark}
              disabled={code.length !== 6 || loading}
              className="px-5 py-2.5 bg-white text-green-700 rounded-xl font-semibold text-sm hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Hantar
            </button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Already marked */}
      {active && marked && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-800">Kehadiran Direkodkan!</p>
            <p className="text-sm text-green-600 mt-0.5">{active.title}</p>
          </div>
        </div>
      )}

      {/* No active session */}
      {!active && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 mb-5 flex items-center justify-between">
          <p className="text-sm text-gray-500">Tiada sesi kehadiran aktif buat masa ini</p>
          <button
            onClick={checkActive}
            disabled={checking}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            Semak
          </button>
        </div>
      )}

      {/* Attendance history */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 text-sm">Rekod Kehadiran</p>
              <p className="text-xs text-gray-400 mt-0.5">{history.length} sesi</p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                {pct}%
              </p>
              <p className="text-xs text-gray-400">{present}/{history.length} hadir</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100">
            <div
              className={`h-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-orange-400' : 'bg-red-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-5 py-3">
                {h.status === 'PRESENT' ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : h.status === null ? (
                  <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{h.title}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(h.date).toLocaleDateString('ms-MY', { dateStyle: 'medium' })}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  h.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                  h.status === 'LATE' ? 'bg-orange-100 text-orange-700' :
                  h.status === null ? 'bg-gray-100 text-gray-400' :
                  'bg-red-100 text-red-700'
                }`}>
                  {h.status === 'PRESENT' ? 'Hadir' :
                   h.status === 'LATE' ? 'Lewat' :
                   h.status === 'EXCUSED' ? 'Dikecualikan' :
                   h.status === 'ABSENT' ? 'Tidak Hadir' : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
