"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"

interface AnomaliesTableProps {
  anomalies: any[]
}

export function AnomaliesTable({ anomalies }: AnomaliesTableProps) {
  if (anomalies.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-green-600" />
          <p>No anomalies found - all stock counts look normal!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Outlet</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Previous</TableHead>
            <TableHead>Counted</TableHead>
            <TableHead>Difference</TableHead>
            <TableHead>Severity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {anomalies.map((anomaly, index) => {
            const severity =
              Math.abs(anomaly.difference) > 20 ? "high" : Math.abs(anomaly.difference) > 10 ? "medium" : "low"

            return (
              <TableRow key={index}>
                <TableCell>{new Date(anomaly.opname_date).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{anomaly.outlet_name}</TableCell>
                <TableCell>{anomaly.staff_name}</TableCell>
                <TableCell>{anomaly.item.name}</TableCell>
                <TableCell>{anomaly.previous_stock}</TableCell>
                <TableCell>{anomaly.counted_stock}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {anomaly.difference > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={anomaly.difference > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}
                    >
                      {anomaly.difference > 0 ? "+" : ""}
                      {anomaly.difference}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={severity === "high" ? "destructive" : severity === "medium" ? "default" : "secondary"}
                  >
                    {severity}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
