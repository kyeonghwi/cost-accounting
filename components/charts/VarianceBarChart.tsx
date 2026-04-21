'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// @AX:NOTE: [AUTO] magic constant — height={300} is a fixed pixel value; replace with a responsive prop if chart container height varies
// @AX:NOTE: [AUTO] magic constant — fill="#4f46e5" is hardcoded Indigo-600; tie to design token if theme support is added

type Props = { data: Array<{ name: string; value: number }> }

export function VarianceBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#4f46e5" />
      </BarChart>
    </ResponsiveContainer>
  )
}
