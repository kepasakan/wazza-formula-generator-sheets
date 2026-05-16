import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import SupportLinksManager from './SupportLinksManager'

export default async function AdminSupportLinksPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/dashboard')

  const links = await prisma.supportLink.findMany({
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  })

  return <SupportLinksManager initialLinks={links} />
}
