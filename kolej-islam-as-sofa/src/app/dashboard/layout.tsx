import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Sidebar from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar role={session.role} name={session.name} email={session.email} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400">Kolej Islam As-Sofa</p>
            <h1 className="text-lg font-semibold text-gray-900">Sistem Pengurusan Pembelajaran</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{session.name}</p>
              <p className="text-xs text-gray-500">{session.email}</p>
            </div>
            <div className="w-9 h-9 bg-green-700 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {session.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
