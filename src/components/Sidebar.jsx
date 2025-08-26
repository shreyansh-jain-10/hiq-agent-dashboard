import { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Bot,
  Search,
  Star,
  StarOff,
  Settings,
  Moon,
  Sun,
  User,
  Bell,
  Menu,
  X,
  Filter,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'


const agents = [
  // {
  //   id: 'document-gatekeeper',
  //   name: '1. Document Gatekeeper 📋',
  //   description: `Analyzes and Check for report validity and three mandatory sections(Chain of Custody, Certificate Analysis, Site History), and extracts key info like volumes, areas, and consultant name.`,
  //   icon: FileText,
  //   webhook: 'https://gluagents.xyz/webhook/e91d733a-4fe5-41cf-a024-9b2ec3a6f914'
  // },
  // {
  //   id: 'sample-police',
  //   name: '2. Sample Police 🔢',
  //   description: `Extracts sample counts per domain/stockpile, checks against EPA Table 3/4 and ENM Order sampling rules, and flags any domains needing more samples or missing validation.`,
  //   icon: FileText,
  //   webhook: 'https://gluagents.xyz/webhook/c08346a1-e41e-49b7-a64a-35570baf409d'
  // },
  // {
  //   id: 'waste-organizer',
  //   name: '3. Waste Organizer 📦',
  //   description: `Identifies all domains/stockpiles, extracts key details (name, volume, material type), checks for exemptions (VENM, ENM) using EPA/ENM Order definitions, ensures all chemical/sampling requirements are met, and flags issues like asbestos or foreign material.`,
  //   icon: FileText,
  //   webhook: 'https://gluagents.xyz/webhook/141a29f6-00d4-4c60-95f5-e2b924b873dc'
  // },
  // {
  //   id: 'danger-detector',
  //   name: '4. Danger Detector ⚠️',
  //   description: `Scans each domain for hazards: PFAS (latest thresholds), asbestos, clinical waste, dangerous goods, PASS/Acid Sulphate Soil, scheduled chemicals, and all relevant EPA limits. Flags all detected dangers with clear warnings. (FOR NOW IT WILL TAKE SOME TIME TO PROCESS[As it is internally calling 3rd agent first] It will be reduced when we integrate them.)`,
  //   icon: FileText,
  //   webhook: 'https://gluagents.xyz/webhook/c4cd6ede-85e1-42a8-812c-81c325d619d2'
  // },
  // {
  //   id: 'epa-rulebook',
  //   name: '5. EPA Rule Book 📊',
  //   description: `Assigns official EPA waste class (General Solid, Restricted, Hazardous, Special/Liquid) for each domain, compares all chemical results to EPA Table 1 & 2 (including PFAS addendum), cites any exceedances, and outputs the strictest class required by regulations. (FOR NOW IT WILL TAKE SOME TIME TO PROCESS[As it is internally calling 3rd and 4th agent first] It will be reduced when we integrate them.)`,
  //   icon: FileText,
  //   webhook: 'https://gluagents.xyz/webhook/306f5aee-9a58-410c-8174-5c11074085d2'
  // },
  // {
  //   id: 'recycling-hunter',
  //   name: '6. The Recycling Hunter ♻️',
  //   description: `Checks if material qualifies for recycling. If eligible, assigns the correct recycling category according to the categorisation table. If not, provides reasons.`,
  //   icon: FileText,
  //   webhook: 'https://gluagents.xyz/webhook/b8e96366-e881-493c-8508-ebff2b657217'
  // },
  {
    id: 'unified-flow',
    name: 'NSW Compliance Agent',
    description: `Runs all agents in sequence, gathers their results, and provides a single consolidated view of statuses and responses.`,
    icon: FileText,
    webhook: 'https://gluagents.xyz/webhook/23145b04-8328-41c1-b417-ef201e806dd7'
  }
]

export default function Sidebar({
  selectedAgent,
  onAgentSelect,
  theme = 'light',
  onThemeChange,
  collapsed = false,
  onToggleCollapse
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [favorites, setFavorites] = useState(['unified-flow'])
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Filter and search agents
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesSearch
    })
  }, [searchQuery, statusFilter, categoryFilter])

  // Sort agents: favorites first, then by name
  const sortedAgents = useMemo(() => {
    return [...filteredAgents].sort((a, b) => {
      const aIsFavorite = favorites.includes(a.id)
      const bIsFavorite = favorites.includes(b.id)

      if (aIsFavorite && !bIsFavorite) return -1
      if (!aIsFavorite && bIsFavorite) return 1
      return a.name.localeCompare(b.name)
    })
  }, [filteredAgents, favorites])

  const toggleFavorite = (agentId) => {
    setFavorites(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    )
  }

  if (collapsed) {
    return (
      <div className="w-16 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-screen flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 p-2 space-y-2">
          {sortedAgents.slice(0, 3).map((agent) => {
            const Icon = agent.icon
            const isSelected = selectedAgent?.id === agent.id
            const isFavorite = favorites.includes(agent.id)

            return (
              <button
                key={agent.id}
                onClick={() => onAgentSelect(agent)}
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 relative group ${isSelected
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                title={agent.name}
              >
                <Icon className="w-5 h-5" />
                {isFavorite && (
                  <Star className="w-3 h-3 text-yellow-500 absolute -top-1 -right-1 fill-current" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">HiQ Agent Testing</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dashboard</p>
            </div>
          </div>
        </div>

        {/* User Profile */}

      </div>

      {/* Search and Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {showFilters && (
          <div className="mt-3 space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="document">Document</option>
                <option value="analysis">Analysis</option>
                <option value="organization">Organization</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Available Agents ({sortedAgents.length})
            </h2>
          </div>

          <div className="space-y-2">
            {sortedAgents.map((agent) => {
              const Icon = agent.icon
              const isSelected = selectedAgent?.id === agent.id
              const isFavorite = favorites.includes(agent.id)

              return (
                <div
                  key={agent.id}
                  className={`relative group rounded-xl border transition-all duration-200 ${isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm'
                    }`}
                >
                  <button
                    onClick={() => onAgentSelect(agent)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className={`p-2 rounded-lg ${isSelected
                            ? 'bg-blue-100 dark:bg-blue-900/40'
                            : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'
                          }`}>
                          <Icon className={`w-5 h-5 ${isSelected
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                            }`} />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {agent.name}
                          </h3>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                          {agent.description}
                        </p>

                      </div>
                    </div>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(agent.id)
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {isFavorite ? (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    ) : (
                      <StarOff className="w-4 h-4 text-gray-400 hover:text-yellow-500" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {sortedAgents.length === 0 && (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No agents found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
