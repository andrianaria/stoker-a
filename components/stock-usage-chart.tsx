"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useMemo } from "react"

interface StockUsageChartProps {
  data: any[]
}

export function StockUsageChart({ data }: StockUsageChartProps) {
  const chartData = useMemo(() => {
    // Group data by date and calculate total stock movements
    const groupedData = data.reduce((acc: any, opname) => {
      const date = opname.opname_date
      if (!acc[date]) {
        acc[date] = {
          date,
          totalItems: 0,
          totalDiscrepancies: 0,
          positiveChanges: 0,
          negativeChanges: 0,
        }
      }

      opname.stock_opname_details?.forEach((detail: any) => {
        acc[date].totalItems += 1
        if (Math.abs(detail.difference) > 0) {
          acc[date].totalDiscrepancies += 1
        }
        if (detail.difference > 0) {
          acc[date].positiveChanges += detail.difference
        } else if (detail.difference < 0) {
          acc[date].negativeChanges += Math.abs(detail.difference)
        }
      })

      return acc
    }, {})

    return Object.values(groupedData)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14) // Last 14 days
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No stock usage data available for the selected period
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleDateString()}
            formatter={(value: any, name: string) => [
              value,
              name === "positiveChanges"
                ? "Stock Increases"
                : name === "negativeChanges"
                  ? "Stock Decreases"
                  : name === "totalDiscrepancies"
                    ? "Discrepancies"
                    : "Total Items",
            ]}
          />
          <Legend />
          <Bar dataKey="positiveChanges" fill="#22c55e" name="Stock Increases" />
          <Bar dataKey="negativeChanges" fill="#ef4444" name="Stock Decreases" />
          <Bar dataKey="totalDiscrepancies" fill="#f59e0b" name="Discrepancies" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
