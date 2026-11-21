import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Building2 } from "lucide-react"
import Link from "next/link"
import { OpnameConfigForm } from "@/components/opname-config-form"

export default async function SettingsPage() {
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

  // Get all outlets for configuration
  const { data: outlets } = await supabase
    .from("outlets")
    .select(`
      *,
      opname_config:opname_configs(*)
    `)
    .eq("is_active", true)
    .order("name")

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
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">System Settings</h1>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Opname Configuration</h2>
          <p className="text-muted-foreground">Configure stock opname frequency and penalty settings for each outlet</p>
        </div>

        <div className="space-y-6">
          {outlets?.map((outlet) => (
            <Card key={outlet.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle>{outlet.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <OpnameConfigForm outlet={outlet} config={outlet.opname_config?.[0]} />
              </CardContent>
            </Card>
          ))}
        </div>

        {(!outlets || outlets.length === 0) && (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No outlets found</h3>
              <p className="text-muted-foreground mb-4">Create outlets first to configure opname settings</p>
              <Link href="/admin/outlets/new">
                <Button>Add First Outlet</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
