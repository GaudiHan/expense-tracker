import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CategorySummary } from '../types'

interface Props {
  data: CategorySummary[]
}

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function CategoryChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="empty-state">Add a few expenses to see the breakdown.</p>
  }

  const chartData = data.map((d) => ({
    category: d.category.charAt(0) + d.category.slice(1).toLowerCase(),
    total: d.total,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
        <XAxis dataKey="category" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--line)' }} tickLine={false} />
        <YAxis
          tick={{ fill: 'var(--muted)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => currency.format(v)}
        />
        <Tooltip
          formatter={(value: number) => currency.format(value)}
          contentStyle={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 4 }}
        />
        <Bar dataKey="total" fill="var(--accent)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
