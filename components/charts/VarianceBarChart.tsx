'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// @AX:NOTE: [AUTO] magic constant — height={300} is a fixed pixel value; replace with a responsive prop if chart container height varies

type Props = { data: Array<{ name: string; value: number }> }

export function VarianceBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value">
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.value < 0 ? '#ef4444' : '#4f46e5'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
