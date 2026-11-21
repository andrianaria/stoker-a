import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, Package, BarChart3, MapPin, Phone } from "lucide-react"
import Link from "next/link"

export default async function ManagerOutletsPage() {
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

  // Get manager's outlets with staff count and recent opname data
  const { data: outlets } = await supabase
    .from("outlets")
    .select(`
      *,
      outlet_staff(count),
      items(count),
      opname_config:opname_configs(*)
    `)
    .eq("manager_id", data.user.id)
    .order("created_at", { ascending: false })

  // Get today's opname completion status
  const today = new Date().toISOString().split("T")[0]
  const outletIds = outlets?.map((o) => o.id) || []

  const { data: todayOpnames } = await supabase
    .from("stock_opnames")
    .select("outlet_id, status")
    .eq("opname_date", today)
    .in("outlet_id", outletIds)

  const opnameStatusMap = new Map()
  todayOpnames?.forEach((opname) => {
    opnameStatusMap.set(opname.outlet_id, opname.status)
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
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">My Outlets</h1>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Outlet Overview</h2>
          <p className="text-muted-foreground">Monitor and manage your assigned outlets</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {outlets?.map((outlet) => {
            const staffCount = outlet.outlet_staff?.[0]?.count || 0
            const itemCount = outlet.items?.[0]?.count || 0
            const config = outlet.opname_config?.[0]
            const todayStatus = opnameStatusMap.get(outlet.id)

            let statusBadge
            if (todayStatus === "completed") {
              statusBadge = <Badge className="bg-green-100 text-green-800">Completed Today</Badge>
            } else if (todayStatus === "in_progress") {
              statusBadge = <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
            } else if (config?.is_active) {
              statusBadge = <Badge variant="destructive">Pending</Badge>
            } else {
              statusBadge = <Badge variant="secondary">Not Scheduled</Badge>
            }

            return (
              <Card key={outlet.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{outlet.name}</CardTitle>
                    <Badge variant={outlet.is_active ? "default" : "secondary"}>
                      {outlet.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-2">{statusBadge}</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{outlet.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{outlet.phone}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{staffCount} staff</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{itemCount} items</span>
                    </div>
                  </div>

                  {config && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      Opname:{" "}
                      {config.frequency_days === 1
                        ? "Daily"
                        : config.frequency_days === 3
                          ? "Every 3 days"
                          : config.frequency_days === 7
                            ? "Weekly"
                            : `Every ${config.frequency_days} days`}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Link href={`/manager/outlets/${outlet.id}/details`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {(!outlets || outlets.length === 0) && (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No outlets assigned</h3>
              <p className="text-muted-foreground">Contact your administrator to get assigned to outlets</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
