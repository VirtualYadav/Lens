import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, X, Database, Sheet, Sparkles } from 'lucide-react'
import { uploadFile, DatasetInfo, addRecent, RecentDataset } from '../lib/api'

interface Props {
  onUpload: (resp: DatasetInfo) => void
  currentDataset?: DatasetInfo | null
  onClear: () => void
}

const FILE_TYPE: Record<string, { icon: any; label: string; color: string }> = {
  csv: { icon: Sheet, label: 'CSV', color: 'text-violet-300' },
  xlsx: { icon: FileSpreadsheet, label: 'Excel', color: 'text-emerald-300' },
  xls: { icon: FileSpreadsheet, label: 'Excel', color: 'text-emerald-300' },
  db: { icon: Database, label: 'SQLite', color: 'text-cyan-300' },
  sqlite: { icon: Database, label: 'SQLite', color: 'text-cyan-300' },
  sqlite3: { icon: Database, label: 'SQLite', color: 'text-cyan-300' },
}

export function Uploader({ onUpload, currentDataset, onClear }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setLoading(true)
    try {
      const resp = await uploadFile(file)
      onUpload(resp)
      // Track in recent
      const recent: RecentDataset = {
        id: resp.dataset_id,
        filename: resp.filename,
        file_type: resp.file_type,
        table_count: resp.tables.length,
        timestamp: Date.now(),
      }
      addRecent(recent)
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  if (currentDataset) {
    const meta = FILE_TYPE[currentDataset.file_type] || FILE_TYPE.csv
    const Icon = meta.icon
    const totalRows = currentDataset.tables.reduce((s, t) => s + t.rows, 0)
    const tableLabel = currentDataset.tables.length === 1
      ? `${currentDataset.tables[0].rows.toLocaleString()} rows`
      : `${currentDataset.tables.length} tables · ${totalRows.toLocaleString()} rows total`

    return (
      <div className="glass-strong rounded-2xl p-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <Icon className={meta.color} size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {currentDataset.filename}
              </div>
              <div className="text-xs text-violet-200/70">
                {meta.label} · {tableLabel}
              </div>
            </div>
          </div>
          <button
            onClick={onClear}
            className="text-violet-300/60 hover:text-white p-1.5 flex-shrink-0 rounded-lg hover:bg-white/5"
            title="Remove"
          >
            <X size={16} />
          </button>
        </div>

        {currentDataset.tables.length > 1 && (
          <div className="mt-3 pt-3 border-t border-violet-400/20 space-y-1.5">
            {currentDataset.tables.map(t => (
              <div key={t.name} className="flex items-center gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" />
                <span className="text-white font-medium">{t.original_name}</span>
                <span className="text-violet-200/50">
                  — {t.rows.toLocaleString()} rows · {t.columns.length} fields
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        onClick={() => inputRef.current?.click()}
        className={`
          relative overflow-hidden rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-300
          ${dragging
            ? 'border-2 border-violet-400 bg-violet-500/10 scale-[1.02]'
            : 'border-2 border-dashed border-violet-400/30 hover:border-violet-400/60 glass'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.db,.sqlite,.sqlite3"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />

        {/* Subtle gradient overlay */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.2), transparent 60%)',
          }}
        />

        <div className="relative">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-violet-200">Reading your data...</p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center mb-3">
                <Upload className="text-violet-200" size={26} />
              </div>
              <p className="text-base font-medium text-white mb-1">
                Drop a file to look closer
              </p>
              <p className="text-xs text-violet-200/60">
                CSV · Excel · SQLite — your data stays on device
              </p>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-violet-300/50">
                <Sparkles size={11} />
                <span>Works in Hindi, Spanish, French, and 9 more languages</span>
              </div>
            </>
          )}
        </div>
      </div>
      {error && (
        <p className="text-xs text-rose-300 mt-2 px-1">{error}</p>
      )}
    </div>
  )
}
