import { useState, useRef, useEffect } from 'react'
import { Uploader } from './components/Uploader'
import { ChatInput } from './components/ChatInput'
import { ResultCard } from './components/ResultCard'
import { QuickActions } from './components/QuickActions'
import { RecentFiles } from './components/RecentFiles'
import { EmptyState } from './components/EmptyState'
import { Logo } from './components/Logo'
import {
  DatasetInfo, QueryResponse, askQuestion
} from './lib/api'
import { Languages, Github, Trash2 } from 'lucide-react'

interface Message {
  role: 'user' | 'ai' | 'error'
  text?: string
  result?: QueryResponse
}

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिं' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'de', label: 'DE' },
  { code: 'pt', label: 'PT' },
  { code: 'ja', label: '日本' },
  { code: 'zh', label: '中' },
  { code: 'ar', label: 'عر' },
]

export default function App() {
  const [dataset, setDataset] = useState<DatasetInfo | null>(null)
  const [activeTable, setActiveTable] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [busy, setBusy] = useState(false)
  const [language, setLanguage] = useState('en')
  const [showLangs, setShowLangs] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, busy])

  // Keyboard shortcut: Cmd/Ctrl+K to focus input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const ta = document.querySelector('textarea') as HTMLTextAreaElement
        ta?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleAsk = async (question: string) => {
    if (!dataset) return
    setMessages(m => [...m, { role: 'user', text: question }])
    setBusy(true)
    try {
      const result = await askQuestion(
        dataset.dataset_id,
        question,
        activeTable || undefined,
        language,
      )
      setMessages(m => [...m, { role: 'ai', result }])
    } catch (e: any) {
      setMessages(m => [...m, { role: 'error', text: e.message }])
    } finally {
      setBusy(false)
    }
  }

  const clearChat = () => setMessages([])

  return (
    <div className="relative h-full flex flex-col">
      {/* Decorative background orbs */}
      <div
        className="orb"
        style={{
          width: 300, height: 300, top: -100, left: -100,
          background: '#8b5cf6',
        }}
      />
      <div
        className="orb"
        style={{
          width: 250, height: 250, bottom: 100, right: -50,
          background: '#06b6d4',
        }}
      />

      {/* Header */}
      <header className="relative z-10 glass-strong border-b border-violet-400/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h1 className="text-base font-bold text-lens">Lens</h1>
              <p className="text-[10px] text-violet-200/60 -mt-0.5 tracking-wide">
                Look closer at your data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Language picker */}
            <div className="relative">
              <button
                onClick={() => setShowLangs(!showLangs)}
                className="flex items-center gap-1.5 text-xs text-violet-200/80
                           hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5"
              >
                <Languages size={14} />
                <span className="font-medium">
                  {LANGS.find(l => l.code === language)?.label}
                </span>
              </button>
              {showLangs && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowLangs(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-30 glass-strong rounded-xl p-1.5 min-w-[140px]">
                    {LANGS.map(l => (
                      <button
                        key={l.code}
                        onClick={() => { setLanguage(l.code); setShowLangs(false) }}
                        className={`
                          w-full text-left text-xs px-3 py-1.5 rounded-lg
                          ${language === l.code
                            ? 'bg-gradient-to-r from-violet-500/30 to-cyan-500/30 text-white'
                            : 'text-violet-200/80 hover:bg-white/5'}
                        `}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <a
              href="https://github.com/VirtualYadav"
              target="_blank"
              rel="noreferrer"
              className="text-violet-200/60 hover:text-white p-2 rounded-lg hover:bg-white/5"
            >
              <Github size={14} />
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-hidden flex flex-col max-w-3xl w-full mx-auto px-4 py-4">
        <div className="space-y-3 mb-3">
          <Uploader
            currentDataset={dataset}
            onUpload={(r) => {
              setDataset(r)
              setActiveTable(null)
              setMessages([])
            }}
            onClear={() => {
              setDataset(null)
              setActiveTable(null)
              setMessages([])
            }}
          />

          {!dataset && <RecentFiles onSelect={() => {
            // Recent files only work locally — show a helpful message
            alert('Please re-upload the file. Recent list is just a memory of filenames; the actual data needs to be re-uploaded (free hosting is memory-only).')
          }} />}

          {/* Table picker */}
          {dataset && dataset.tables.length > 1 && (
            <div className="glass rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-violet-300/60 mb-2 px-1 uppercase tracking-wider font-semibold">
                <span>Focus on table</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveTable(null)}
                  className={`
                    text-xs px-3 py-1.5 rounded-lg transition-all
                    ${activeTable === null
                      ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium shadow-lg shadow-violet-500/20'
                      : 'bg-violet-500/10 text-violet-200/80 hover:bg-violet-500/20'}
                  `}
                >
                  Auto
                </button>
                {dataset.tables.map(t => (
                  <button
                    key={t.name}
                    onClick={() => setActiveTable(t.name)}
                    className={`
                      text-xs px-3 py-1.5 rounded-lg transition-all
                      ${activeTable === t.name
                        ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium shadow-lg shadow-violet-500/20'
                        : 'bg-violet-500/10 text-violet-200/80 hover:bg-violet-500/20'}
                    `}
                  >
                    {t.original_name}
                    <span className="ml-1 opacity-60 text-[10px]">
                      ({t.rows.toLocaleString()})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          {dataset && (
            <QuickActions
              onAction={handleAsk}
              tableName={activeTable
                ? dataset.tables.find(t => t.name === activeTable)?.original_name || 'data'
                : dataset.tables[0]?.original_name || 'data'}
            />
          )}
        </div>

        {/* Chat area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto lens-scroll space-y-4 pb-3"
        >
          {!dataset && <EmptyState hasDataset={false} onAction={handleAsk} />}

          {dataset && messages.length === 0 && (
            <div className="text-center py-8 text-violet-200/50 text-sm animate-fade-in">
              👆 Try a quick action above, or ask anything
            </div>
          )}

          {messages.map((m, i) => {
            if (m.role === 'user') {
              return (
                <div key={i} className="flex justify-end animate-slide-up">
                  <div
                    className="rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] text-sm
                               bg-gradient-to-br from-violet-500 to-cyan-500 text-white
                               shadow-lg shadow-violet-500/20"
                  >
                    {m.text}
                  </div>
                </div>
              )
            }
            if (m.role === 'error') {
              return (
                <div
                  key={i}
                  className="bg-rose-500/10 border border-rose-400/30 rounded-2xl p-3 text-sm text-rose-200 animate-slide-up"
                >
                  ⚠️ {m.text}
                </div>
              )
            }
            if (m.result) {
              return (
                <ResultCard
                  key={i}
                  result={m.result}
                  onFollowUp={handleAsk}
                />
              )
            }
            return null
          })}

          {busy && (
            <div className="flex items-center gap-2 text-violet-200/60 text-sm px-1">
              <div className="flex gap-1">
                <div
                  className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
              <span>Looking closer...</span>
            </div>
          )}
        </div>

        {/* Input */}
        {dataset && (
          <div className="pt-2 space-y-2">
            <ChatInput
              onSend={handleAsk}
              disabled={busy}
              placeholder={
                language === 'hi' ? 'अपने डेटा के बारे में कुछ भी पूछें...'
                : language === 'es' ? 'Pregunta cualquier cosa sobre tus datos...'
                : language === 'fr' ? 'Posez n\'importe quelle question...'
                : language === 'de' ? 'Fragen Sie alles über Ihre Daten...'
                : language === 'ja' ? 'データについて何でも聞いてください...'
                : language === 'zh' ? '询问任何关于您数据的问题...'
                : 'Ask anything about your data...'
              }
            />
            <div className="flex items-center justify-between text-[10px] text-violet-300/40 px-1">
              <span>⌘K to focus · Enter to send</span>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="hover:text-violet-200 flex items-center gap-1"
                >
                  <Trash2 size={10} /> Clear
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
