import { useState, useRef, useEffect } from 'react'
import { Send, Mic } from 'lucide-react'

interface Props {
  onSend: (msg: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [text, setText] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto'
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 120) + 'px'
    }
  }, [text])

  const submit = () => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="glass-strong rounded-2xl p-2 flex items-end gap-2 focus-within:border-violet-400/60 transition-colors">
      <textarea
        ref={taRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder={placeholder || 'Ask anything...'}
        rows={1}
        className="flex-1 bg-transparent text-white placeholder-violet-300/40
                   text-sm resize-none focus:outline-none px-3 py-2
                   max-h-32 disabled:opacity-50 leading-relaxed"
        style={{ minHeight: '2.25rem' }}
      />
      <button
        onClick={submit}
        disabled={disabled || !text.trim()}
        className="rounded-xl p-2.5 flex-shrink-0 transition-all duration-200
                   bg-gradient-to-br from-violet-500 to-cyan-500
                   hover:from-violet-400 hover:to-cyan-400
                   disabled:from-slate-700 disabled:to-slate-700
                   disabled:cursor-not-allowed
                   shadow-lg shadow-violet-500/20 disabled:shadow-none
                   active:scale-95"
        aria-label="Send"
      >
        <Send size={16} className="text-white" />
      </button>
    </div>
  )
}
