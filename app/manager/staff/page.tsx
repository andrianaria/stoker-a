import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Mail, Phone, Building2, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"

export default async function ManagerStaffPage() {
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
    .select("id, name")
    .eq("manager_id", data.user.id)
    .eq("is_active", true)

  const outletIds = outlets?.map((o) => o.id) || []

  // Get staff assigned to manager's outlets
  const { data: staffAssignments } = await supabase
    .from("outlet_staff")
    .select(`
      *,
      staff:profiles(id, full_name, email, phone, is_active),
      outlet:outlets(name)
    `)
    .in("outlet_id", outletIds)

  // Get recent performance data
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const staffIds = staffAssignments?.map((a) => a.staff.id) || []

  const [{ data: recentOpnames }, { data: penalties }] = await Promise.all([
    supabase
      .from("stock_opnames")
      .select("staff_id, status, opname_date")
      .in("staff_id", staffIds)
      .gte("opname_date", thirtyDaysAgo.toISOString().split("T")[0]),
    supabase.from("staff_penalties").select("staff_id, penalty_points, resolved").in("staff_id", staffIds),
  ])

  // Calculate performance metrics
  const staffPerformance =
    staffAssignments?.map((assignment) => {
      const staffOpnames = recentOpnames?.filter((o) => o.staff_id === assignment.staff.id) || []
      const staffPenalties = penalties?.filter((p) => p.staff_id === assignment.staff.id && !p.resolved) || []
      const totalPenalties = staffPenalties.reduce((sum, p) => sum + p.penalty_points, 0)

      const completedOpnames = staffOpnames.filter((o) => o.status === "completed").length
      const completionRate = staffOpnames.length > 0 ? Math.round((completedOpnames / staffOpnames.length) * 100) : 0

      return {
        ...assignment,
        total_opnames: staffOpnames.length,
        completed_opnames: completedOpnames,
        completion_rate: completionRate,
        penalty_points: totalPenalties,
        status: totalPenalties > 5 ? "warning" : completionRate < 80 ? "attention" : "good",
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
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">My Staff</h1>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Staff Performance</h2>
          <p className="text-muted-foreground">Monitor staff assigned to your outlets</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {staffPerformance.map((staff) => (
            <Card key={`${staff.staff.id}-${staff.outlet.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{staff.staff.full_name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {staff.status === "good" && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {staff.status === "attention" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                    {staff.status === "warning" && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    <Badge
                      variant={
                        staff.status === "good" ? "default" : staff.status === "attention" ? "secondary" : "destructive"
                      }
                    >
                      {staff.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{staff.outlet.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{staff.staff.email}</span>
                </div>
                {staff.staff.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{staff.staff.phone}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Completion Rate</div>
                    <div className="font-medium">{staff.completion_rate}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Opnames</div>
                    <div className="font-medium">{staff.total_opnames}</div>
                  </div>
                </div>

                {staff.penalty_points > 0 && (
                  <div className="bg-red-50 border border-red-200 p-2 rounded text-sm">
                    <div className="flex items-center gap-1 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{staff.penalty_points} penalty points</span>
                    </div>
                  </div>
                )}

                <Badge variant={staff.staff.is_active ? "default" : "secondary"} className="w-fit">
                  {staff.staff.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {staffPerformance.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No staff assigned</h3>
              <p className="text-muted-foreground">Staff members will appear here once assigned to your outlets</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
