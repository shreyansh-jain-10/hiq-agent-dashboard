import { Users, UserPlus, Shield, MapPin } from 'lucide-react'
import { getUserRole, getIsAdmin } from '@/utils/userUtils'

export default function StatsCards({ users, sites }) {
  const stats = [
    {
      title: 'Total Users',
      value: users.length,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Admins',
      value: users.filter((u) => getIsAdmin(u)).length,
      icon: Shield,
      color: 'purple'
    },
    {
      title: 'Reviewers',
      value: users.filter((u) => getUserRole(u) === 'reviewer').length,
      icon: Users,
      color: 'green'
    },
    {
      title: 'Regular Users',
      value: users.filter((u) => getUserRole(u) === 'user').length,
      icon: UserPlus,
      color: 'gray'
    },
    {
      title: 'Active Sites',
      value: sites.length,
      icon: MapPin,
      color: 'orange'
    }
  ]

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      gray: 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
    }
    return colorMap[color] || colorMap.blue
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div key={index} className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${getColorClasses(stat.color)}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
