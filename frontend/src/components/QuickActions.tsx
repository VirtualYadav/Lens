import { BarChart3, Hash, TrendingUp, ListOrdered, Shuffle } from 'lucide-react'

interface Props {
  onAction: (prompt: string) => void
  tableName: string
}

const ACTIONS = [
  {
    icon: Hash,
    label: 'Summary',
    color: 'from-violet-500/20 to-violet-500/5',
    prompt: (t: string) => `Give me a quick summary of the "${t}" table — how many rows, what columns, basic stats`,
  },
  {
    icon: BarChart3,
    label: 'Top 10',
    color: 'from-cyan-500/20 to-cyan-500/5',
    prompt: (t: string) => `What are the top 10 by the most important numeric column? Show as a chart`,
  },
  {
    icon: TrendingUp,
    label: 'Trends',
    color: 'from-pink-500/20 to-pink-500/5',
    prompt: (t: string) => `Show me the trend over time. Group by month if there's a date column`,
  },
  {
    icon: ListOrdered,
    label: 'Outliers',
    color: 'from-amber-500/20 to-amber-500/5',
    prompt: (t: string) => `Find unusual values or outliers — anything that stands out as different`,
  },
  {
    icon: Shuffle,
    label: 'Compare',
    color: 'from-emerald-500/20 to-emerald-500/5',
    prompt: (t: string) => `Compare categories — group by the most useful categorical column and show totals`,
  },
]

export function QuickActions({ onAction, tableName }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {ACTIONS.map((a) => {
        const Icon = a.icon
        return (
          <button
            key={a.label}
            onClick={() => onAction(a.prompt(tableName))}
            className={`
              flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl
              bg-gradient-to-br ${a.color} glass
              hover:scale-105 active:scale-95 transition-transform
              border border-violet-400/20
            `}
          >
            <Icon size={13} className="text-violet-200" />
            <span className="text-xs font-medium text-violet-100 whitespace-nowrap">
              {a.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
