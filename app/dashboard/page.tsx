import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Building2, Users, Package, BarChart3, Settings } from "lucide-react"
import Link from "next/link"
import { ReminderBanner } from "@/components/reminder-banner"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile with role
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  const stats = { outlets: 0, staff: 0, todayOpname: 0, pendingTasks: 0 }

  if (profile?.role === "admin") {
    // Admin sees all outlets and staff
    const [outletsResult, staffResult, opnameResult] = await Promise.all([
      supabase.from("outlets").select("id").eq("is_active", true),
      supabase.from("profiles").select("id").eq("role", "staff").eq("is_active", true),
      supabase.from("stock_opnames").select("id").eq("opname_date", new Date().toISOString().split("T")[0]),
    ])

    stats.outlets = outletsResult.data?.length || 0
    stats.staff = staffResult.data?.length || 0
    stats.todayOpname = opnameResult.data?.length || 0
  } else if (profile?.role === "manager") {
    // Manager sees only their outlets
    const [outletsResult, staffResult, opnameResult] = await Promise.all([
      supabase.from("outlets").select("id").eq("manager_id", data.user.id).eq("is_active", true),
      supabase
        .from("outlet_staff")
        .select("staff_id")
        .in(
          "outlet_id",
          (await supabase.from("outlets").select("id").eq("manager_id", data.user.id)).data?.map((o) => o.id) || [],
        ),
      supabase
        .from("stock_opnames")
        .select("id")
        .eq("opname_date", new Date().toISOString().split("T")[0])
        .in(
          "outlet_id",
          (await supabase.from("outlets").select("id").eq("manager_id", data.user.id)).data?.map((o) => o.id) || [],
        ),
    ])

    stats.outlets = outletsResult.data?.length || 0
    stats.staff = staffResult.data?.length || 0
    stats.todayOpname = opnameResult.data?.length || 0
  }

  const handleSignOut = async () => {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Stock Opname System</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {profile?.full_name || data.user.email} ({profile?.role})
            </span>
            <form action={handleSignOut}>
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="p-6">
        {profile?.role === "staff" && <ReminderBanner staffId={data.user.id} />}

        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            {profile?.role === "admin"
              ? "System administration and oversight"
              : profile?.role === "manager"
                ? "Manage your outlets and staff"
                : "Your daily stock opname tasks"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outlets</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.outlets}</div>
              <p className="text-xs text-muted-foreground">Active locations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.staff}</div>
              <p className="text-xs text-muted-foreground">Active staff</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Opname</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayOpname}</div>
              <p className="text-xs text-muted-foreground">Completed today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTasks}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.role === "admin" && (
                <div className="grid gap-4 md:grid-cols-4">
                  <Link href="/admin/outlets">
                    <Button className="h-20 w-full flex-col gap-2 bg-transparent" variant="outline">
                      <Building2 className="h-6 w-6" />
                      Manage Outlets
                    </Button>
                  </Link>
                  <Link href="/admin/staff">
                    <Button className="h-20 w-full flex-col gap-2 bg-transparent" variant="outline">
                      <Users className="h-6 w-6" />
                      Manage Staff
                    </Button>
                  </Link>
                  <Link href="/admin/items">
                    <Button className="h-20 w-full flex-col gap-2 bg-transparent" variant="outline">
                      <Package className="h-6 w-6" />
                      Manage Items
                    </Button>
                  </Link>
                  <Link href="/admin/settings">
                    <Button className="h-20 w-full flex-col gap-2 bg-transparent" variant="outline">
                      <Settings className="h-6 w-6" />
                      System Settings
                    </Button>
                  </Link>
                </div>
              )}

              {profile?.role === "manager" && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Link href="/manager/outlets">
                    <Button className="h-20 w-full flex-col gap-2 bg-transparent" variant="outline">
                      <Building2 className="h-6 w-6" />
                      My Outlets
                    </Button>
                  </Link>
                  <Link href="/manager/staff">
                    <Button className="h-20 w-full flex-col gap-2 bg-transparent" variant="outline">
                      <Users className="h-6 w-6" />
                      My Staff
                    </Button>
                  </Link>
                  <Link href="/manager/reports">
                    <Button className="h-20 w-full flex-col gap-2 bg-transparent" variant="outline">
                      <BarChart3 className="h-6 w-6" />
                      View Reports
                    </Button>
                  </Link>
                </div>
              )}

              {profile?.role === "staff" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Link href="/staff/opname">
                    <Button className="h-20 w-full flex-col gap-2 bg-transparent" variant="outline">
                      <Package className="h-6 w-6" />
                      Daily Opname
                    </Button>
                  </Link>
                  <Link href="/staff/history">
                    <Button className="h-20 w-full flex-col gap-2 bg-transparent" variant="outline">
                      <BarChart3 className="h-6 w-6" />
                      My History
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
