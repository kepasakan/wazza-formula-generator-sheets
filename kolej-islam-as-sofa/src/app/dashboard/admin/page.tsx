import { prisma } from '@/lib/db'
import { Users, BookMarked, GraduationCap, CalendarCheck, TrendingUp, UserCheck } from 'lucide-react'

async function getAdminStats() {
  const [totalStudents, totalLecturers, totalCourses, totalEnrollments, recentUsers] =
    await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'LECTURER' } }),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
    ])
  return { totalStudents, totalLecturers, totalCourses, totalEnrollments, recentUsers }
}

const roleLabel = { ADMIN: 'Pentadbir', LECTURER: 'Pensyarah', STUDENT: 'Pelajar' }
const roleBadge = {
  ADMIN: 'bg-purple-100 text-purple-700',
  LECTURER: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
}

export default async function AdminDashboard() {
  const stats = await getAdminStats()

  const statCards = [
    {
      label: 'Jumlah Pelajar',
      value: stats.totalStudents,
      icon: <GraduationCap className="w-6 h-6" />,
      color: 'bg-green-50 text-green-700',
      iconBg: 'bg-green-100',
      trend: '+12 bulan ini',
    },
    {
      label: 'Jumlah Pensyarah',
      value: stats.totalLecturers,
      icon: <UserCheck className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-700',
      iconBg: 'bg-blue-100',
      trend: 'Aktif semua',
    },
    {
      label: 'Jumlah Kursus',
      value: stats.totalCourses,
      icon: <BookMarked className="w-6 h-6" />,
      color: 'bg-orange-50 text-orange-700',
      iconBg: 'bg-orange-100',
      trend: 'Semester 2 2025/2026',
    },
    {
      label: 'Jumlah Pendaftaran',
      value: stats.totalEnrollments,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-purple-50 text-purple-700',
      iconBg: 'bg-purple-100',
      trend: 'Meningkat 8%',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Pentadbir</h2>
        <p className="text-gray-500 text-sm mt-1">Semester 2 — Sesi Akademik 2025/2026</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1.5">{card.trend}</p>
              </div>
              <div className={`w-11 h-11 ${card.iconBg} rounded-xl flex items-center justify-center ${card.color}`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent users + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent users */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              Pengguna Terbaru
            </h3>
            <span className="text-xs text-gray-400">5 terkini</span>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="px-6 py-3.5 flex items-center gap-4">
                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-700 text-sm font-semibold">
                    {user.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${roleBadge[user.role as keyof typeof roleBadge]}`}>
                  {roleLabel[user.role as keyof typeof roleLabel]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Tindakan Pantas</h3>
          </div>
          <div className="p-4 space-y-2">
            {[
              { label: 'Tambah Pengguna Baru', icon: <Users className="w-4 h-4" />, color: 'hover:bg-green-50 hover:text-green-700 hover:border-green-200' },
              { label: 'Cipta Kursus Baru', icon: <BookMarked className="w-4 h-4" />, color: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200' },
              { label: 'Lihat Laporan Kehadiran', icon: <CalendarCheck className="w-4 h-4" />, color: 'hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200' },
              { label: 'Jana Laporan Semester', icon: <TrendingUp className="w-4 h-4" />, color: 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200' },
            ].map((action) => (
              <button
                key={action.label}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 text-sm text-gray-600 transition-all ${action.color}`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="bg-gradient-to-r from-green-800 to-emerald-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Status Sistem</h3>
            <p className="text-green-200 text-sm mt-1">Semua perkhidmatan beroperasi dengan normal</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Online</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { label: 'Versi Sistem', value: 'v1.0.0-demo' },
            { label: 'Sesi Akademik', value: '2025/2026' },
            { label: 'Semester', value: 'Semester 2' },
          ].map((info) => (
            <div key={info.label} className="bg-white/10 rounded-lg p-3">
              <p className="text-green-200 text-xs">{info.label}</p>
              <p className="text-white font-semibold text-sm mt-0.5">{info.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
