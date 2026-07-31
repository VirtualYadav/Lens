import { QueryResponse } from '../lib/api'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Code2, Lightbulb, ArrowRight } from 'lucide-react'

const COLORS = ['#a78bfa', '#06b6d4', '#f472b6', '#fbbf24', '#34d399', '#fb7185']

interface Props {
  result: QueryResponse
  onFollowUp?: (q: string) => void
}

export function ResultCard({ result, onFollowUp }: Props) {
  const [showSQL, setShowSQL] = useState(false)
  const [showTable, setShowTable] = useState(true)

  return (
    <div className="space-y-3 animate-slide-up">
      {/* AI explanation */}
      {result.explanation && (
        <p className="text-violet-100/90 text-sm leading-relaxed px-1">
          {result.explanation}
        </p>
      )}

      {/* Insight card — the key differentiator */}
      {result.insight && (
        <div className="relative overflow-hidden rounded-2xl glass-strong p-4">
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)',
              transform: 'translate(40%, -40%)',
            }}
          />
          <div className="relative flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
              <Lightbulb size={18} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/70 mb-1">
                Key insight
              </div>
              <p className="text-white text-sm font-medium leading-relaxed">
                {result.insight}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {result.chart && (
        <div className="glass rounded-2xl p-4">
          <ResponsiveContainer width="100%" height={260}>
            {result.chart.type === 'bar' ? (
              <BarChart data={result.chart.data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey={result.chart.x}
                  tick={{ fill: '#c4b5fd', fontSize: 10 }}
                  axisLine={{ stroke: '#4c1d95' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#c4b5fd', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30, 27, 75, 0.95)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                />
                <Bar dataKey={result.chart.y} fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : result.chart.type === 'line' ? (
              <AreaChart data={result.chart.data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey={result.chart.x}
                  tick={{ fill: '#c4b5fd', fontSize: 10 }}
                  axisLine={{ stroke: '#4c1d95' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#c4b5fd', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30, 27, 75, 0.95)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={result.chart.y}
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                  fill="url(#areaGradient)"
                />
              </AreaChart>
            ) : (
              <PieChart>
                <Pie
                  data={result.chart.data}
                  dataKey={result.chart.y}
                  nameKey={result.chart.x}
                  cx="50%" cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                  label={({ value }) => value}
                  labelLine={false}
                >
                  {result.chart.data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#1e1b4b" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30, 27, 75, 0.95)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#c4b5fd' }}
                  iconType="circle"
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Follow-up suggestions */}
      {result.follow_ups && result.follow_ups.length > 0 && onFollowUp && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/60 px-1">
            Try next
          </div>
          {result.follow_ups.map((q, i) => (
            <button
              key={i}
              onClick={() => onFollowUp(q)}
              className="w-full text-left text-xs text-violet-100/90 glass
                         hover:bg-violet-500/10 rounded-xl p-3
                         transition-colors flex items-center gap-2 group"
            >
              <ArrowRight size={12} className="text-violet-300/60 group-hover:text-cyan-300 flex-shrink-0" />
              <span className="flex-1">{q}</span>
            </button>
          ))}
        </div>
      )}

      {/* Toggle buttons */}
      <div className="flex gap-2 px-1">
        <button
          onClick={() => setShowTable(!showTable)}
          className="flex items-center gap-1.5 text-xs text-violet-200/70 hover:text-white
                     px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          {showTable ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {result.rows.length} rows
        </button>
        <button
          onClick={() => setShowSQL(!showSQL)}
          className="flex items-center gap-1.5 text-xs text-violet-200/70 hover:text-white
                     px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <Code2 size={13} />
          {showSQL ? 'Hide' : 'View'} SQL
        </button>
      </div>

      {/* Data table */}
      {showTable && result.rows.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-bg-800/95 backdrop-blur">
                <tr className="border-b border-violet-400/20">
                  {result.columns.map(c => (
                    <th
                      key={c}
                      className="text-left py-2.5 px-3 text-violet-300 font-medium whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.slice(0, 50).map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-violet-400/10 hover:bg-violet-500/5"
                  >
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="py-2 px-3 text-violet-50/90 whitespace-nowrap"
                      >
                        {cell === null ? (
                          <span className="text-violet-400/40">—</span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.rows.length > 50 && (
            <div className="text-xs text-violet-300/50 py-2 text-center border-t border-violet-400/20">
              Showing 50 of {result.rows.length} rows
            </div>
          )}
        </div>
      )}

      {/* SQL */}
      {showSQL && (
        <pre className="glass rounded-2xl p-4 text-xs text-cyan-200 overflow-x-auto">
          <code>{result.sql}</code>
        </pre>
      )}
    </div>
  )
}
