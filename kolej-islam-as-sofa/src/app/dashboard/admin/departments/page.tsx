import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import DepartmentsManager from './DepartmentsManager'

export default async function AdminDepartmentsPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/dashboard')

  const [depts, courses] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { courses: true } } },
    }),
    prisma.course.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, title: true, code: true, departmentId: true },
    }),
  ])

  return <DepartmentsManager initialDepts={depts} allCourses={courses} />
}
