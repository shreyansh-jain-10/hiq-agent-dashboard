import { MapPin } from 'lucide-react'

export default function SitesTable({ sites }) {
  if (sites.length === 0) {
    return (
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">All Sites</h2>
        </div>
        <div className="p-8 text-center text-muted-foreground">
          No sites found. Create your first site above.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">All Sites</h2>
      </div>
      
      <div className="overflow-x-auto -mx-6 sm:mx-0">
        <table className="w-full min-w-[500px]">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sites.map((site) => (
              <tr key={site.id} className="hover:bg-muted/30 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-sm font-medium">
                      <MapPin size={14} />
                    </div>
                    <span className="font-medium text-foreground">{site.display_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <code className="px-2 py-1 bg-muted rounded text-xs">{site.name}</code>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    site.is_active 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {site.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {site.created_at ? new Date(site.created_at).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
