'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// @AX:NOTE: [AUTO] magic constant — height={280} is a fixed pixel value; replace with a responsive prop if chart container height varies

type Props = { data: Array<{ name: string; value: number }> }

export function VarianceBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: 'var(--color-text-3)' }}
          axisLine={{ stroke: 'var(--color-border)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-text-3)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => v.toLocaleString()}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            fontSize: 12,
            color: 'var(--color-text-1)',
          }}
          cursor={{ fill: 'var(--color-surface-alt)' }}
        />
        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.value < 0 ? 'var(--color-negative)' : 'var(--color-accent)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
