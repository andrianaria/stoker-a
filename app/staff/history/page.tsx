import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Calendar, Building2, Package, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { PenaltyStatus } from "@/components/penalty-status"

export default async function StaffHistoryPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user is staff
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()
  if (profile?.role !== "staff") {
    redirect("/dashboard")
  }

  // Get staff's opname history
  const { data: opnameHistory } = await supabase
    .from("stock_opnames")
    .select(`
      *,
      outlet:outlets(name),
      stock_opname_details(
        item:items(name),
        previous_stock,
        counted_stock,
        difference
      )
    `)
    .eq("staff_id", data.user.id)
    .order("opname_date", { ascending: false })
    .limit(20)

  // Get penalty points
  const { data: penalties } = await supabase
    .from("staff_penalties")
    .select("*")
    .eq("staff_id", data.user.id)
    .eq("resolved", false)

  const totalPenaltyPoints = penalties?.reduce((sum, penalty) => sum + penalty.penalty_points, 0) || 0

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
            <h1 className="text-xl font-semibold">My History</h1>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Performance Overview</h2>
          <p className="text-muted-foreground">Your stock opname history and current status</p>
        </div>

        {/* Penalty Status Component */}
        <div className="mb-8">
          <PenaltyStatus staffId={data.user.id} />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Opnames</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{opnameHistory?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Completed tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {opnameHistory?.filter((opname) => {
                  const opnameDate = new Date(opname.opname_date)
                  const now = new Date()
                  return opnameDate.getMonth() === now.getMonth() && opnameDate.getFullYear() === now.getFullYear()
                }).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Penalty Points</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalPenaltyPoints > 0 ? "text-red-600" : "text-green-600"}`}>
                {totalPenaltyPoints}
              </div>
              <p className="text-xs text-muted-foreground">Current total</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Opname History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {opnameHistory?.map((opname) => {
                const totalDiscrepancies =
                  opname.stock_opname_details?.filter((detail: any) => Math.abs(detail.difference) > 0).length || 0

                return (
                  <div key={opname.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{opname.outlet.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(opname.opname_date).toLocaleDateString()}
                      </div>
                      <Badge variant={opname.status === "completed" ? "default" : "secondary"}>{opname.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">{opname.total_items} items</div>
                      {totalDiscrepancies > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {totalDiscrepancies} discrepancies
                        </Badge>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {opname.completed_at ? new Date(opname.completed_at).toLocaleTimeString() : "In progress"}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {(!opnameHistory || opnameHistory.length === 0) && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No opname history</h3>
                <p className="text-muted-foreground">Complete your first stock opname to see history here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Penalties Section */}
        {penalties && penalties.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-red-600">Active Penalties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {penalties.map((penalty) => (
                  <div
                    key={penalty.id}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-red-800">{penalty.reason}</div>
                      <div className="text-sm text-red-600">{new Date(penalty.penalty_date).toLocaleDateString()}</div>
                      {penalty.notes && <div className="text-sm text-red-600 mt-1">{penalty.notes}</div>}
                    </div>
                    <Badge variant="destructive">{penalty.penalty_points} points</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
