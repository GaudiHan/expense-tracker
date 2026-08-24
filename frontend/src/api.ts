import type { AuthResponse, CategorySummary, Expense, ExpenseInput } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(body?.error ?? `Request failed (${res.status})`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  register: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  listExpenses: (token: string) => request<Expense[]>('/api/expenses', {}, token),

  createExpense: (token: string, input: ExpenseInput) =>
    request<Expense>('/api/expenses', { method: 'POST', body: JSON.stringify(input) }, token),

  deleteExpense: (token: string, id: number) =>
    request<void>(`/api/expenses/${id}`, { method: 'DELETE' }, token),

  categorySummary: (token: string) => request<CategorySummary[]>('/api/summary/by-category', {}, token),
}
