import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Clock, CheckCircle, AlertTriangle, Building2 } from "lucide-react"
import Link from "next/link"

export default async function StaffOpnamePage() {
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

  // Get staff's assigned outlets with opname configs
  const { data: assignments } = await supabase
    .from("outlet_staff")
    .select(`
      outlet:outlets(
        *,
        opname_config:opname_configs(*),
        items(count)
      )
    `)
    .eq("staff_id", data.user.id)

  // Get today's opname status for each outlet
  const today = new Date().toISOString().split("T")[0]
  const outletIds = assignments?.map((a) => a.outlet.id) || []

  const { data: todayOpnames } = await supabase
    .from("stock_opnames")
    .select("outlet_id, status, completed_at")
    .eq("staff_id", data.user.id)
    .eq("opname_date", today)
    .in("outlet_id", outletIds)

  // Create a map of outlet opname status
  const opnameStatusMap = new Map()
  todayOpnames?.forEach((opname) => {
    opnameStatusMap.set(opname.outlet_id, opname)
  })

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
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Daily Stock Opname</h1>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Today's Tasks</h2>
          <p className="text-muted-foreground">Complete stock counting for your assigned outlets</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assignments?.map((assignment) => {
            const outlet = assignment.outlet
            const config = outlet.opname_config?.[0]
            const todayStatus = opnameStatusMap.get(outlet.id)
            const itemCount = outlet.items?.[0]?.count || 0

            // Check if opname is required today based on frequency
            const isRequired = config?.is_active && config?.frequency_days

            let statusBadge, statusIcon, actionButton

            if (todayStatus?.status === "completed") {
              statusBadge = <Badge className="bg-green-100 text-green-800">Completed</Badge>
              statusIcon = <CheckCircle className="h-5 w-5 text-green-600" />
              actionButton = (
                <Link href={`/staff/opname/${outlet.id}/view`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    View Details
                  </Button>
                </Link>
              )
            } else if (todayStatus?.status === "in_progress") {
              statusBadge = <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
              statusIcon = <Clock className="h-5 w-5 text-yellow-600" />
              actionButton = (
                <Link href={`/staff/opname/${outlet.id}/continue`} className="flex-1">
                  <Button size="sm" className="w-full">
                    Continue
                  </Button>
                </Link>
              )
            } else if (isRequired) {
              statusBadge = <Badge variant="destructive">Pending</Badge>
              statusIcon = <AlertTriangle className="h-5 w-5 text-red-600" />
              actionButton = (
                <Link href={`/staff/opname/${outlet.id}/start`} className="flex-1">
                  <Button size="sm" className="w-full">
                    Start Opname
                  </Button>
                </Link>
              )
            } else {
              statusBadge = <Badge variant="secondary">Not Required</Badge>
              statusIcon = <Package className="h-5 w-5 text-gray-400" />
              actionButton = (
                <Button variant="outline" size="sm" className="w-full bg-transparent" disabled>
                  No Action Needed
                </Button>
              )
            }

            return (
              <Card key={outlet.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {outlet.name}
                    </CardTitle>
                    {statusBadge}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {statusIcon}
                    <span>
                      {todayStatus?.status === "completed"
                        ? `Completed at ${new Date(todayStatus.completed_at).toLocaleTimeString()}`
                        : todayStatus?.status === "in_progress"
                          ? "In progress..."
                          : isRequired
                            ? `${itemCount} items to count`
                            : "Not scheduled for today"}
                    </span>
                  </div>

                  {config && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      Frequency:{" "}
                      {config.frequency_days === 1
                        ? "Daily"
                        : config.frequency_days === 3
                          ? "Every 3 days"
                          : config.frequency_days === 7
                            ? "Weekly"
                            : `Every ${config.frequency_days} days`}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">{actionButton}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {(!assignments || assignments.length === 0) && (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No outlet assignments</h3>
              <p className="text-muted-foreground">Contact your manager to get assigned to outlets</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
