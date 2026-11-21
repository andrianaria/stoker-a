import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Plus, Edit, MapPin, Phone, User } from "lucide-react"
import Link from "next/link"

export default async function OutletsPage() {
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

  // Get all outlets with manager info
  const { data: outlets } = await supabase
    .from("outlets")
    .select(`
      *,
      manager:profiles!outlets_manager_id_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false })

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
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Outlet Management</h1>
            </div>
          </div>
          <Link href="/admin/outlets/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Outlet
            </Button>
          </Link>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">All Outlets</h2>
          <p className="text-muted-foreground">Manage your business locations and assignments</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {outlets?.map((outlet) => (
            <Card key={outlet.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{outlet.name}</CardTitle>
                  <Badge variant={outlet.is_active ? "default" : "secondary"}>
                    {outlet.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{outlet.manager?.full_name || "No manager assigned"}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Link href={`/admin/outlets/${outlet.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/admin/outlets/${outlet.id}/items`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      Items
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!outlets || outlets.length === 0) && (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No outlets found</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first outlet</p>
              <Link href="/admin/outlets/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Outlet
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
