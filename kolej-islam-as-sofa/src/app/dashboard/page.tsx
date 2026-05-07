import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (session.role === 'ADMIN') redirect('/dashboard/admin')
  if (session.role === 'LECTURER') redirect('/dashboard/lecturer')
  redirect('/dashboard/student')
}
