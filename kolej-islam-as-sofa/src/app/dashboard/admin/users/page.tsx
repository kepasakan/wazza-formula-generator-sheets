import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AddUserPanel from './AddUserPanel'

export default async function AdminUsersPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/dashboard')

  const [students, lecturers, admins] = await Promise.all([
    prisma.user.findMany({ where: { role: 'STUDENT' }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, role: true, matricNo: true, createdAt: true } }),
    prisma.user.findMany({ where: { role: 'LECTURER' }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, role: true, staffId: true, createdAt: true } }),
    prisma.user.findMany({ where: { role: 'ADMIN' }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pengurusan Pengguna</h2>
          <p className="text-gray-500 text-sm mt-1">
            {students.length} pelajar · {lecturers.length} pensyarah · {admins.length} pentadbir
          </p>
        </div>
        <AddUserPanel />
      </div>

      {/* Lecturers */}
      <Section title="Pensyarah" count={lecturers.length} color="bg-blue-50 text-blue-700">
        {lecturers.map(u => (
          <UserRow key={u.id} name={u.name} email={u.email} sub={u.staffId ?? undefined} badge="Pensyarah" badgeColor="bg-blue-100 text-blue-700" />
        ))}
      </Section>

      {/* Students */}
      <Section title="Pelajar" count={students.length} color="bg-green-50 text-green-700">
        {students.map(u => (
          <UserRow key={u.id} name={u.name} email={u.email} sub={u.matricNo ?? undefined} badge="Pelajar" badgeColor="bg-green-100 text-green-700" />
        ))}
      </Section>

      {/* Admins */}
      <Section title="Pentadbir" count={admins.length} color="bg-purple-50 text-purple-700">
        {admins.map(u => (
          <UserRow key={u.id} name={u.name} email={u.email} badge="Pentadbir" badgeColor="bg-purple-100 text-purple-700" />
        ))}
      </Section>
    </div>
  )
}

function Section({ title, count, color, children }: { title: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`px-6 py-4 border-b border-gray-100 flex items-center gap-3`}>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${color}`}>{count} orang</span>
      </div>
      {count === 0 ? (
        <div className="px-6 py-6 text-center text-sm text-gray-400">Tiada pengguna dalam kategori ini</div>
      ) : (
        <div className="divide-y divide-gray-50">{children}</div>
      )}
    </div>
  )
}

function UserRow({ name, email, sub, badge, badgeColor }: { name: string; email: string; sub?: string; badge: string; badgeColor: string }) {
  return (
    <div className="flex items-center gap-4 px-6 py-3.5">
      <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-green-700 text-sm font-semibold">{name.charAt(0)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500 truncate">{email}</p>
      </div>
      {sub && <p className="text-xs text-gray-400 flex-shrink-0">{sub}</p>}
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${badgeColor}`}>{badge}</span>
    </div>
  )
}
