// Lens — API client
/// <reference types="vite/client" />

const DEV_BACKEND = 'http://localhost:7377'
const PROD_BACKEND = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''

const BASE = import.meta.env.DEV ? DEV_BACKEND : (PROD_BACKEND || window.location.origin)

export interface TableInfo {
  name: string
  original_name: string
  rows: number
  columns: string[]
}

export interface ColumnInfo {
  table: string
  table_sql: string
  name: string
  type: string
  samples: string[]
}

export interface DatasetInfo {
  dataset_id: string
  filename: string
  file_type: string
  tables: TableInfo[]
  schema_info: ColumnInfo[]
  primary_table: string
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie'
  x: string
  y: string
  data: Array<Record<string, any>>
}

export interface QueryResponse {
  sql: string
  explanation: string
  insight: string
  follow_ups: string[]
  columns: string[]
  rows: any[][]
  chart: ChartData | null
  used_table: string
}

export async function uploadFile(file: File): Promise<DatasetInfo> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export async function askQuestion(
  dataset_id: string,
  question: string,
  table?: string,
  language: string = 'en',
): Promise<QueryResponse> {
  const res = await fetch(`${BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_id, question, table, language }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Query failed' }))
    throw new Error(err.detail || 'Query failed')
  }
  return res.json()
}

export async function deleteDataset(dataset_id: string) {
  const res = await fetch(`${BASE}/datasets/${dataset_id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete')
  return res.json()
}

const RECENT_KEY = 'lens:recent-datasets'

export interface RecentDataset {
  id: string
  filename: string
  file_type: string
  table_count: number
  timestamp: number
}

export function addRecent(ds: Omit<RecentDataset, 'timestamp'>) {
  const list = getRecent().filter(r => r.id !== ds.id)
  list.unshift({ ...ds, timestamp: Date.now() })
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5)))
}

export function getRecent(): RecentDataset[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

export function clearRecent() {
  localStorage.removeItem(RECENT_KEY)
}
