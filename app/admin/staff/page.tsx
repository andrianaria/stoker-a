import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Mail, Phone, Building2 } from "lucide-react"
import Link from "next/link"

export default async function StaffPage() {
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

  // Get all staff with their outlet assignments
  const { data: staff } = await supabase
    .from("profiles")
    .select(`
      *,
      outlet_assignments:outlet_staff(
        outlet:outlets(name)
      )
    `)
    .neq("role", "admin")
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
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Staff Management</h1>
            </div>
          </div>
          <Link href="/admin/staff/invite">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Invite Staff
            </Button>
          </Link>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">All Staff Members</h2>
          <p className="text-muted-foreground">Manage staff accounts and outlet assignments</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {staff?.map((member) => (
            <Card key={member.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{member.full_name}</CardTitle>
                  <div className="flex flex-col gap-1">
                    <Badge variant={member.role === "manager" ? "default" : "secondary"}>{member.role}</Badge>
                    <Badge variant={member.is_active ? "default" : "destructive"} className="text-xs">
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{member.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>
                    {member.outlet_assignments?.length > 0
                      ? `${member.outlet_assignments.length} outlet(s)`
                      : "No assignments"}
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Link href={`/admin/staff/${member.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/admin/staff/${member.id}/assignments`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      Assignments
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!staff || staff.length === 0) && (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No staff members found</h3>
              <p className="text-muted-foreground mb-4">Start by inviting your first staff member</p>
              <Link href="/admin/staff/invite">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite First Staff Member
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
