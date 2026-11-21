import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, AlertTriangle, Users, Building2 } from "lucide-react"
import Link from "next/link"
import { StockUsageChart } from "@/components/stock-usage-chart"
import { AnomaliesTable } from "@/components/anomalies-table"
import { StaffPerformanceTable } from "@/components/staff-performance-table"

export default async function ManagerReportsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user is manager
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()
  if (profile?.role !== "manager") {
    redirect("/dashboard")
  }

  // Get manager's outlets
  const { data: outlets } = await supabase
    .from("outlets")
    .select("*")
    .eq("manager_id", data.user.id)
    .eq("is_active", true)

  const outletIds = outlets?.map((o) => o.id) || []

  // Get recent opname data for analytics
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: recentOpnames } = await supabase
    .from("stock_opnames")
    .select(`
      *,
      outlet:outlets(name),
      staff:profiles(full_name),
      stock_opname_details(
        item:items(name, category),
        previous_stock,
        counted_stock,
        difference
      )
    `)
    .in("outlet_id", outletIds)
    .gte("opname_date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("opname_date", { ascending: false })

  // Calculate summary statistics
  const totalOpnames = recentOpnames?.length || 0
  const completedOpnames = recentOpnames?.filter((o) => o.status === "completed").length || 0
  const completionRate = totalOpnames > 0 ? Math.round((completedOpnames / totalOpnames) * 100) : 0

  // Find anomalies (large discrepancies)
  const anomalies =
    recentOpnames
      ?.flatMap((opname) =>
        opname.stock_opname_details
          ?.filter((detail: any) => Math.abs(detail.difference) > 5) // Threshold for anomaly
          .map((detail: any) => ({
            ...detail,
            opname_date: opname.opname_date,
            outlet_name: opname.outlet.name,
            staff_name: opname.staff.full_name,
          })),
      )
      .filter(Boolean) || []

  // Get staff performance data
  const { data: staffPerformance } = await supabase
    .from("outlet_staff")
    .select(`
      staff:profiles(id, full_name),
      outlet:outlets(name),
      staff_penalties(penalty_points, penalty_date, reason)
    `)
    .in("outlet_id", outletIds)

  // Calculate staff stats
  const staffStats =
    staffPerformance?.map((assignment) => {
      const staffOpnames = recentOpnames?.filter((o) => o.staff_id === assignment.staff.id) || []
      const totalPenalties = assignment.staff_penalties?.reduce((sum: number, p: any) => sum + p.penalty_points, 0) || 0

      return {
        staff_id: assignment.staff.id,
        staff_name: assignment.staff.full_name,
        outlet_name: assignment.outlet.name,
        total_opnames: staffOpnames.length,
        completed_opnames: staffOpnames.filter((o) => o.status === "completed").length,
        penalty_points: totalPenalties,
        last_opname: staffOpnames[0]?.opname_date || null,
      }
    }) || []

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
          <div className="flex items-center gap-2 ml-4">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Manager Reports</h1>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor stock usage, anomalies, and staff performance across your outlets
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outlets</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{outlets?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Under management</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anomalies Found</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{anomalies.length}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staffStats.length}</div>
              <p className="text-xs text-muted-foreground">Assigned to outlets</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Tabs defaultValue="usage" className="space-y-6">
          <TabsList>
            <TabsTrigger value="usage">Stock Usage</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            <TabsTrigger value="performance">Staff Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Usage Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <StockUsageChart data={recentOpnames || []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Stock Anomalies</CardTitle>
                  <Badge variant="destructive">{anomalies.length} found</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <AnomaliesTable anomalies={anomalies} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Staff Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <StaffPerformanceTable staffStats={staffStats} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
