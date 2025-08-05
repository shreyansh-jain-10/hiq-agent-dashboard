import { useState } from 'react'
import { FileText, Bot } from 'lucide-react'

const agents = [
  {
    id: 'hiq-document-checker',
    name: 'HIQ-Document Checker',
    description: 'Analyzes and validates document quality(Check for report validity and three mandatory sections)',
    icon: FileText,
    webhook: 'https://gluagents.xyz/webhook/e91d733a-4fe5-41cf-a024-9b2ec3a6f914'
  },
  {
    id: 'sample-adequacy-checker',
    name: 'Sample Adequacy Checker',
    description: 'Checks if samples per domain are adequate or not.',
    icon: FileText,
    webhook: 'https://gluagents.xyz/webhook/c08346a1-e41e-49b7-a64a-35570baf409d'
  }
]

export default function Sidebar({ selectedAgent, onAgentSelect }) {
  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-sidebar-primary" />
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">HIQ Agent Testing</h1>
            <p className="text-sm text-sidebar-foreground/60">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="flex-1 p-4">
        <h2 className="text-sm font-medium text-sidebar-foreground/80 mb-3 uppercase tracking-wide">
          Available Agents
        </h2>
        <div className="space-y-2">
          {agents.map((agent) => {
            const Icon = agent.icon
            const isSelected = selectedAgent?.id === agent.id

            return (
              <button
                key={agent.id}
                onClick={() => onAgentSelect(agent)}
                className={`w-full p-3 rounded-lg text-left transition-all duration-200 group ${isSelected
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-primary'
                    }`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{agent.name}</h3>
                    <p className="text-xs text-sidebar-foreground/60 mt-1 line-clamp-2">
                      {agent.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/50 text-center">
          Select an agent to start testing
        </p>
      </div>
    </div>
  )
}

