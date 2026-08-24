import { useEffect, useState } from 'react'
import { api, ApiError } from './api'
import { AuthForm } from './components/AuthForm'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { CategoryChart } from './components/CategoryChart'
import type { AuthResponse, CategorySummary, Expense, ExpenseInput } from './types'

const STORAGE_KEY = 'ledger.auth'

function loadAuth(): AuthResponse | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as AuthResponse) : null
}

export default function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(loadAuth)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<CategorySummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
    else localStorage.removeItem(STORAGE_KEY)
  }, [auth])

  useEffect(() => {
    if (auth) void refresh(auth.token)
  }, [auth])

  async function refresh(token: string) {
    setLoading(true)
    setError(null)
    try {
      const [expenseList, categoryTotals] = await Promise.all([
        api.listExpenses(token),
        api.categorySummary(token),
      ])
      setExpenses(expenseList)
      setSummary(categoryTotals)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      if (err instanceof ApiError && err.message.toLowerCase().includes('unauthorized')) setAuth(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(input: ExpenseInput) {
    if (!auth) return
    await api.createExpense(auth.token, input)
    await refresh(auth.token)
  }

  async function handleDelete(id: number) {
    if (!auth) return
    await api.deleteExpense(auth.token, id)
    await refresh(auth.token)
  }

  if (!auth) {
    return (
      <main className="page auth-page">
        <AuthForm onAuthenticated={setAuth} />
      </main>
    )
  }

  const monthTotal = expenses
    .filter((e) => e.spentOn.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((sum, e) => sum + e.amount, 0)

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1 className="brand">Ledger</h1>
          <p className="brand-sub">{auth.email}</p>
        </div>
        <button type="button" className="link" onClick={() => setAuth(null)}>
          Sign out
        </button>
      </header>

      <section className="summary-strip">
        <div>
          <span className="stat-label">This month</span>
          <span className="stat-value mono">
            {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(monthTotal)}
          </span>
        </div>
      </section>

      <section className="card">
        <h2>Add an expense</h2>
        <ExpenseForm onAdd={handleAdd} />
      </section>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <h2>By category</h2>
        <CategoryChart data={summary} />
      </section>

      <section className="card">
        <h2>All entries {loading && <span className="loading-tag">refreshing…</span>}</h2>
        <ExpenseList expenses={expenses} onDelete={handleDelete} />
      </section>
    </main>
  )
}
