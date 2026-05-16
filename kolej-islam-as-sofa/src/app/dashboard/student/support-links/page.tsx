import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ExternalLink, Link2 } from 'lucide-react'

export default async function StudentSupportLinksPage() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') redirect('/dashboard')

  const links = await prisma.supportLink.findMany({
    where: { isActive: true },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  })

  const grouped = links.reduce<Record<string, typeof links>>((acc, link) => {
    const cat = link.category ?? 'Lain-lain'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(link)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pautan Bantuan</h2>
        <p className="text-gray-500 text-sm mt-1">Pautan & sumber berguna dari pihak pentadbiran</p>
      </div>

      {links.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
          <Link2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Tiada pautan bantuan buat masa ini</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catLinks]) => (
            <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{category}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {catLinks.map(link => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f7f6' }}>
                      <ExternalLink className="w-4 h-4" style={{ color: '#0d9488' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700 transition-colors">{link.title}</p>
                      {link.description && <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>}
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-teal-500 flex-shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
