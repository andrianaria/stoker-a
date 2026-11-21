"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertTriangle, Clock } from "lucide-react"

interface StaffPerformanceTableProps {
  staffStats: any[]
}

export function StaffPerformanceTable({ staffStats }: StaffPerformanceTableProps) {
  if (staffStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p>No staff performance data available</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff Member</TableHead>
            <TableHead>Outlet</TableHead>
            <TableHead>Completion Rate</TableHead>
            <TableHead>Total Opnames</TableHead>
            <TableHead>Penalty Points</TableHead>
            <TableHead>Last Opname</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffStats.map((staff) => {
            const completionRate =
              staff.total_opnames > 0 ? Math.round((staff.completed_opnames / staff.total_opnames) * 100) : 0
            const status = staff.penalty_points > 5 ? "warning" : completionRate < 80 ? "attention" : "good"

            return (
              <TableRow key={staff.staff_id}>
                <TableCell className="font-medium">{staff.staff_name}</TableCell>
                <TableCell>{staff.outlet_name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={completionRate} className="w-16" />
                    <span className="text-sm">{completionRate}%</span>
                  </div>
                </TableCell>
                <TableCell>{staff.total_opnames}</TableCell>
                <TableCell>
                  <Badge variant={staff.penalty_points > 0 ? "destructive" : "secondary"}>{staff.penalty_points}</Badge>
                </TableCell>
                <TableCell>{staff.last_opname ? new Date(staff.last_opname).toLocaleDateString() : "Never"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {status === "good" && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {status === "attention" && <Clock className="h-4 w-4 text-yellow-600" />}
                    {status === "warning" && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    <Badge
                      variant={status === "good" ? "default" : status === "attention" ? "secondary" : "destructive"}
                    >
                      {status}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
