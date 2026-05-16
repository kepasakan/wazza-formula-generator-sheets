import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Megaphone, ChevronRight } from 'lucide-react'

export default async function StudentAnnouncementsPage() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const announcements = await prisma.announcement.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, createdAt: true },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hebahan</h2>
        <p className="text-gray-500 text-sm mt-1">Makluman terkini dari pihak pentadbiran</p>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
          <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Tiada hebahan buat masa ini</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {announcements.map(a => (
              <Link
                key={a.id}
                href={`/dashboard/student/announcements/${a.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f7f6' }}>
                  <Megaphone className="w-4 h-4" style={{ color: '#0d9488' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700 transition-colors">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(a.createdAt).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
