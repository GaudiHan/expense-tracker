import type { Expense } from '../types'

interface Props {
  expenses: Expense[]
  onDelete: (id: number) => void
}

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })

export function ExpenseList({ expenses, onDelete }: Props) {
  if (expenses.length === 0) {
    return <p className="empty-state">No entries yet. Add your first expense above.</p>
  }

  return (
    <table className="ledger-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th className="align-right">Amount</th>
          <th aria-hidden="true"></th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr key={expense.id}>
            <td className="mono">{expense.spentOn}</td>
            <td>{expense.description}</td>
            <td>
              <span className="pill">{expense.category.charAt(0) + expense.category.slice(1).toLowerCase()}</span>
            </td>
            <td className="align-right mono">{currency.format(expense.amount)}</td>
            <td>
              <button
                type="button"
                className="link-danger"
                onClick={() => onDelete(expense.id)}
                aria-label={`Delete ${expense.description}`}
              >
                Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
