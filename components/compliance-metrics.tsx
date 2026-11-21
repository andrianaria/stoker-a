"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react"

export function ComplianceMetrics() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const supabase = createClient()
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0]

        // Get compliance data
        const [{ data: outlets }, { data: opnames }, { data: penalties }, { data: staff }, { data: configs }] =
          await Promise.all([
            supabase.from("outlets").select("id, name, is_active"),
            supabase
              .from("stock_opnames")
              .select("id, status, opname_date, outlet_id")
              .gte("opname_date", thirtyDaysAgoStr),
            supabase.from("staff_penalties").select("*").eq("resolved", false),
            supabase.from("profiles").select("id, role, is_active"),
            supabase.from("opname_configs").select("*"),
          ])

        // Calculate metrics
        const totalOpnames = opnames?.length || 0
        const completedOpnames = opnames?.filter((o) => o.status === "completed").length || 0
        const complianceRate = totalOpnames > 0 ? (completedOpnames / totalOpnames) * 100 : 100

        // Outlet compliance breakdown
        const outletCompliance = outlets?.map((outlet) => {
          const outletOpnames = opnames?.filter((o) => o.outlet_id === outlet.id) || []
          const outletCompleted = outletOpnames.filter((o) => o.status === "completed").length
          const outletRate = outletOpnames.length > 0 ? (outletCompleted / outletOpnames.length) * 100 : 100

          return {
            name: outlet.name,
            compliance: Math.round(outletRate),
            total: outletOpnames.length,
            completed: outletCompleted,
          }
        })

        // Staff performance
        const staffByRole = staff?.reduce((acc: any, s) => {
          acc[s.role] = (acc[s.role] || 0) + 1
          return acc
        }, {})

        // Penalty distribution
        const penaltyData = penalties?.reduce((acc: any, p) => {
          const range = p.penalty_points <= 3 ? "Low (1-3)" : p.penalty_points <= 7 ? "Medium (4-7)" : "High (8+)"
          acc[range] = (acc[range] || 0) + 1
          return acc
        }, {})

        setMetrics({
          complianceRate: Math.round(complianceRate),
          totalOpnames,
          completedOpnames,
          outletCompliance: outletCompliance || [],
          staffByRole,
          penaltyData: Object.entries(penaltyData || {}).map(([name, value]) => ({ name, value })),
          totalPenalties: penalties?.length || 0,
          activePenaltyPoints: penalties?.reduce((sum, p) => sum + p.penalty_points, 0) || 0,
        })
      } catch (error) {
        console.error("Error fetching compliance metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  if (loading) {
    return <div className="text-center py-8">Loading compliance metrics...</div>
  }

  if (!metrics) {
    return <div className="text-center py-8 text-muted-foreground">Unable to load compliance metrics</div>
  }

  const COLORS = ["#22c55e", "#f59e0b", "#ef4444"]

  return (
    <div className="space-y-6">
      {/* Overall Compliance */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
            {metrics.complianceRate >= 90 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{metrics.complianceRate}%</div>
            <Progress value={metrics.complianceRate} className="mb-2" />
            <p className="text-xs text-muted-foreground">
              {metrics.completedOpnames} of {metrics.totalOpnames} opnames completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Penalties</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{metrics.totalPenalties}</div>
            <Badge variant="destructive" className="mb-2">
              {metrics.activePenaltyPoints} points total
            </Badge>
            <p className="text-xs text-muted-foreground">Unresolved penalty cases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {metrics.complianceRate >= 90 ? "Excellent" : metrics.complianceRate >= 70 ? "Good" : "Needs Attention"}
            </div>
            <Badge
              variant={
                metrics.complianceRate >= 90 ? "default" : metrics.complianceRate >= 70 ? "secondary" : "destructive"
              }
            >
              {metrics.complianceRate >= 90 ? "Healthy" : metrics.complianceRate >= 70 ? "Stable" : "At Risk"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Outlet Compliance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Outlet Compliance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.outletCompliance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: any) => [`${value}%`, "Compliance Rate"]} />
                <Bar dataKey="compliance" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Penalty Distribution */}
      {metrics.penaltyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Penalty Point Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.penaltyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metrics.penaltyData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Outlet Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Outlet Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.outletCompliance.map((outlet: any) => (
              <div key={outlet.name} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{outlet.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {outlet.completed} of {outlet.total} opnames completed
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={outlet.compliance} className="w-20" />
                  <Badge
                    variant={
                      outlet.compliance >= 90 ? "default" : outlet.compliance >= 70 ? "secondary" : "destructive"
                    }
                  >
                    {outlet.compliance}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
