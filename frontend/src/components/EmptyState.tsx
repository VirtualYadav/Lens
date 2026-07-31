import { Eye, Sparkles, Globe, Wand2 } from 'lucide-react'

interface Props {
  hasDataset: boolean
  onAction: (prompt: string) => void
}

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Insights, not just answers',
    desc: 'Every result comes with a one-line finding',
  },
  {
    icon: Globe,
    title: 'Speaks your language',
    desc: 'Ask in Hindi, Spanish, French — get answers back the same way',
  },
  {
    icon: Wand2,
    title: 'Suggests what to ask next',
    desc: 'Follow-up questions tailored to your data',
  },
]

export function EmptyState({ hasDataset, onAction }: Props) {
  if (hasDataset) return null

  return (
    <div className="py-6 space-y-6 animate-fade-in">
      <div className="text-center space-y-3">
        <div className="relative inline-block">
          <div className="absolute inset-0 blur-2xl opacity-50">
            <Eye size={60} className="text-violet-400" />
          </div>
          <Eye size={60} className="relative text-lens" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Look closer at your data</h2>
          <p className="text-sm text-violet-200/60 mt-1">
            Upload a file to start
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {FEATURES.map(f => {
          const Icon = f.icon
          return (
            <div key={f.title} className="glass rounded-xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-violet-200" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{f.title}</div>
                <div className="text-xs text-violet-200/60">{f.desc}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center text-xs text-violet-300/40">
        100% private · data never leaves your device · 100% free
      </div>
    </div>
  )
}
