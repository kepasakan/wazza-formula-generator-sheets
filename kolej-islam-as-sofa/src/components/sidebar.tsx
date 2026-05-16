'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookOpen,
  LayoutDashboard,
  Users,
  GraduationCap,
  FileText,
  ClipboardList,
  CalendarCheck,
  BarChart3,
  LogOut,
  ChevronRight,
  BookMarked,
  Link2,
  Megaphone,
  Building2,
} from 'lucide-react'

type Role = 'ADMIN' | 'LECTURER' | 'STUDENT'

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
}

const navByRole: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Pengguna', href: '/dashboard/admin/users', icon: <Users className="w-5 h-5" /> },
    { label: 'Kursus', href: '/dashboard/admin/courses', icon: <BookMarked className="w-5 h-5" /> },
    { label: 'Laporan', href: '/dashboard/admin/reports', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Bidang', href: '/dashboard/admin/departments', icon: <Building2 className="w-5 h-5" /> },
    { label: 'Hebahan', href: '/dashboard/admin/announcements', icon: <Megaphone className="w-5 h-5" /> },
    { label: 'Pautan Bantuan', href: '/dashboard/admin/support-links', icon: <Link2 className="w-5 h-5" /> },
  ],
  LECTURER: [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Kursus Saya', href: '/dashboard/lecturer/courses', icon: <BookMarked className="w-5 h-5" /> },
    { label: 'Tugasan', href: '/dashboard/lecturer/assignments', icon: <FileText className="w-5 h-5" /> },
    { label: 'Kuiz', href: '/dashboard/lecturer/quizzes', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Kehadiran', href: '/dashboard/lecturer/attendance', icon: <CalendarCheck className="w-5 h-5" /> },
    { label: 'Hebahan', href: '/dashboard/lecturer/announcements', icon: <Megaphone className="w-5 h-5" /> },
    { label: 'Pautan Bantuan', href: '/dashboard/lecturer/support-links', icon: <Link2 className="w-5 h-5" /> },
  ],
  STUDENT: [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Kursus Saya', href: '/dashboard/student/courses', icon: <BookMarked className="w-5 h-5" /> },
    { label: 'Tugasan', href: '/dashboard/student/assignments', icon: <FileText className="w-5 h-5" /> },
    { label: 'Kuiz', href: '/dashboard/student/quizzes', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Kehadiran', href: '/dashboard/student/attendance', icon: <CalendarCheck className="w-5 h-5" /> },
    { label: 'Keputusan', href: '/dashboard/student/results', icon: <GraduationCap className="w-5 h-5" /> },
    { label: 'Hebahan', href: '/dashboard/student/announcements', icon: <Megaphone className="w-5 h-5" /> },
    { label: 'Pautan Bantuan', href: '/dashboard/student/support-links', icon: <Link2 className="w-5 h-5" /> },
  ],
}

const roleLabel: Record<Role, string> = {
  ADMIN: 'Pentadbir',
  LECTURER: 'Pensyarah',
  STUDENT: 'Pelajar',
}

const roleBadgeColor: Record<Role, string> = {
  ADMIN: 'bg-purple-500/20 text-purple-200',
  LECTURER: 'bg-blue-500/20 text-blue-200',
  STUDENT: 'bg-emerald-500/20 text-emerald-200',
}

type Props = {
  role: Role
  name: string
  email: string
}

export default function Sidebar({ role, name, email }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const navItems = navByRole[role]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full" style={{ backgroundColor: '#172540' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0d9488' }}>
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">LMS As-Sofa</p>
            <p className="text-blue-300/70 text-xs">Kolej Islam As-Sofa</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'text-white'
                  : 'text-blue-200/70 hover:bg-white/10 hover:text-white'
              }`}
              style={isActive ? { backgroundColor: '#0d9488' } : {}}
            >
              <span className={isActive ? 'text-white' : 'text-blue-300/60 group-hover:text-white'}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-3 rounded-lg bg-white/5 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0d9488' }}>
              <span className="text-white text-sm font-semibold">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColor[role]}`}>
                {roleLabel[role]}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-200/70 hover:bg-red-900/40 hover:text-red-300 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Log Keluar
        </button>
      </div>
    </aside>
  )
}
