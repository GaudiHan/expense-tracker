export type Category =
  | 'FOOD'
  | 'TRANSPORT'
  | 'HOUSING'
  | 'UTILITIES'
  | 'ENTERTAINMENT'
  | 'HEALTH'
  | 'SHOPPING'
  | 'OTHER'

export const CATEGORIES: Category[] = [
  'FOOD',
  'TRANSPORT',
  'HOUSING',
  'UTILITIES',
  'ENTERTAINMENT',
  'HEALTH',
  'SHOPPING',
  'OTHER',
]

export interface Expense {
  id: number
  description: string
  amount: number
  category: Category
  spentOn: string // ISO date, e.g. "2026-08-24"
}

export interface ExpenseInput {
  description: string
  amount: number
  category: Category
  spentOn: string
}

export interface CategorySummary {
  category: Category
  total: number
}

export interface AuthResponse {
  token: string
  email: string
}
