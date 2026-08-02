// Lens — API client
// This file talks to the backend (Python FastAPI on Vercel)

/// <reference types="vite/client" />

// How the frontend finds the backend:
// 1. In dev (npm run dev) → uses localhost:7377 directly
// 2. In production → calls /api on the same Vercel domain
// 3. If VITE_API_URL is set, uses that instead

const DEV_BACKEND = 'http://localhost:7377'
const PROD_BACKEND = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''

// In dev, use localhost. In production, use the same origin (Vercel) or env var
const BASE = import.meta.env.DEV
  ? DEV_BACKEND
  : (PROD_BACKEND || '')

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

// ─────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────

export async function uploadFile(file: File): Promise<DatasetInfo> {
  const form = new FormData()
  form.append('file', file)
  const url = `${BASE}/api/upload`
  const res = await fetch(url, { method: 'POST', body: form })
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
  language: string = 'en'
): Promise<QueryResponse> {
  const url = `${BASE}/api/query`
  const res = await fetch(url, {
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
  const url = `${BASE}/api/datasets/${dataset_id}`
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete')
  return res.json()
}

export async function listDatasets() {
  const url = `${BASE}/api/datasets`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to list datasets')
  return res.json()
}

// ─────────────────────────────────────────────
// Recent Files (browser localStorage)
// ─────────────────────────────────────────────

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
