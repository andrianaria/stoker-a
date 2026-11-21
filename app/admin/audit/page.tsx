import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, FileText, Download, Search } from "lucide-react"
import Link from "next/link"
import { AuditLogTable } from "@/components/audit-log-table"
import { ComplianceMetrics } from "@/components/compliance-metrics"
import { DataExportTools } from "@/components/data-export-tools"

export default async function AuditPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()
  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  // Get recent audit logs
  const { data: recentLogs } = await supabase
    .from("audit_logs")
    .select(`
      *,
      user:profiles(full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(50)

  // Get compliance metrics
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { data: totalOpnames },
    { data: completedOpnames },
    { data: overdueOpnames },
    { data: totalPenalties },
    { data: activeStaff },
  ] = await Promise.all([
    supabase.from("stock_opnames").select("id").gte("opname_date", thirtyDaysAgo.toISOString().split("T")[0]),
    supabase
      .from("stock_opnames")
      .select("id")
      .eq("status", "completed")
      .gte("opname_date", thirtyDaysAgo.toISOString().split("T")[0]),
    supabase
      .from("stock_opnames")
      .select("id")
      .eq("status", "in_progress")
      .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("staff_penalties").select("penalty_points").eq("resolved", false),
    supabase.from("profiles").select("id").eq("role", "staff").eq("is_active", true),
  ])

  const complianceRate = totalOpnames?.length
    ? Math.round(((completedOpnames?.length || 0) / totalOpnames.length) * 100)
    : 100

  const totalPenaltyPoints = totalPenalties?.reduce((sum, p) => sum + p.penalty_points, 0) || 0

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Audit & Compliance</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">System Audit & Compliance</h2>
          <p className="text-muted-foreground">Monitor system integrity, compliance, and audit trails</p>
        </div>

        {/* Compliance Overview */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${complianceRate >= 90 ? "text-green-600" : complianceRate >= 70 ? "text-yellow-600" : "text-red-600"}`}
              >
                {complianceRate}%
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueOpnames?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Penalties</CardTitle>
              <Badge variant="destructive" className="text-xs">
                {totalPenaltyPoints} points
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPenalties?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Unresolved penalties</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeStaff?.length || 0}</div>
              <p className="text-xs text-muted-foreground">System users</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Audit Views */}
        <Tabs defaultValue="logs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Metrics</TabsTrigger>
            <TabsTrigger value="export">Data Export</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Audit Trail</CardTitle>
              </CardHeader>
              <CardContent>
                <AuditLogTable logs={recentLogs || []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <ComplianceMetrics />
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <DataExportTools />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
