import { useState, useEffect } from 'react'
import { Clock, ChevronRight, X, FileSpreadsheet, Database, Sheet } from 'lucide-react'
import { getRecent, clearRecent, RecentDataset } from '../lib/api'

interface Props {
  onSelect: (r: RecentDataset) => void
}

const FILE_ICON = (type: string) => {
  if (type === 'csv' || type === 'tsv') return Sheet
  if (['xlsx', 'xls'].includes(type)) return FileSpreadsheet
  return Database
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

export function RecentFiles({ onSelect }: Props) {
  const [items, setItems] = useState<RecentDataset[]>([])

  useEffect(() => {
    setItems(getRecent())
  }, [])

  if (items.length === 0) return null

  return (
    <div className="glass rounded-2xl p-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-violet-200/80">
          <Clock size={12} />
          <span className="font-medium">Recent</span>
        </div>
        <button
          onClick={() => { clearRecent(); setItems([]) }}
          className="text-[10px] text-violet-300/50 hover:text-violet-200 flex items-center gap-1"
        >
          <X size={10} /> clear
        </button>
      </div>
      <div className="space-y-1">
        {items.slice(0, 4).map(item => {
          const Icon = FILE_ICON(item.file_type)
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full flex items-center gap-3 p-2 rounded-xl
                         hover:bg-violet-500/10 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <Icon size={14} className="text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">
                  {item.filename}
                </div>
                <div className="text-[10px] text-violet-300/50">
                  {item.table_count > 1 ? `${item.table_count} tables` : '1 table'} · {timeAgo(item.timestamp)}
                </div>
              </div>
              <ChevronRight
                size={14}
                className="text-violet-300/40 group-hover:text-cyan-300 flex-shrink-0"
              />
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-violet-300/40 mt-2 px-1">
        Re-upload files to restore — they don't persist on free hosting
      </p>
    </div>
  )
}
