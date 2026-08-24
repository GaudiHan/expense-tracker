import { useState, type FormEvent } from 'react'
import { CATEGORIES, type Category, type ExpenseInput } from '../types'

interface Props {
  onAdd: (input: ExpenseInput) => Promise<void>
}

const today = () => new Date().toISOString().slice(0, 10)

export function ExpenseForm({ onAdd }: Props) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('FOOD')
  const [spentOn, setSpentOn] = useState(today())
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsedAmount = Number(amount)
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return

    setSubmitting(true)
    try {
      await onAdd({ description: description.trim(), amount: parsedAmount, category, spentOn })
      setDescription('')
      setAmount('')
      setCategory('FOOD')
      setSpentOn(today())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <input
        placeholder="What was it for?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
        className="col-description"
      />
      <input
        type="number"
        step="0.01"
        min="0.01"
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="col-amount"
      />
      <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="col-category">
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c.charAt(0) + c.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={spentOn}
        onChange={(e) => setSpentOn(e.target.value)}
        required
        className="col-date"
      />
      <button type="submit" className="primary" disabled={submitting}>
        Add
      </button>
    </form>
  )
}
