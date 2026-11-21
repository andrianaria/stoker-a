import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StockOpnameForm } from "@/components/stock-opname-form"

interface PageProps {
  params: Promise<{ outletId: string }>
}

export default async function StartOpnamePage({ params }: PageProps) {
  const { outletId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user is staff and has access to this outlet
  const { data: assignment } = await supabase
    .from("outlet_staff")
    .select("*")
    .eq("staff_id", data.user.id)
    .eq("outlet_id", outletId)
    .single()

  if (!assignment) {
    redirect("/staff/opname")
  }

  // Get outlet details and items
  const { data: outlet } = await supabase
    .from("outlets")
    .select(`
      *,
      items(*)
    `)
    .eq("id", outletId)
    .single()

  if (!outlet) {
    redirect("/staff/opname")
  }

  // Check if opname already exists for today
  const today = new Date().toISOString().split("T")[0]
  const { data: existingOpname } = await supabase
    .from("stock_opnames")
    .select("*")
    .eq("staff_id", data.user.id)
    .eq("outlet_id", outletId)
    .eq("opname_date", today)
    .single()

  if (existingOpname) {
    redirect(`/staff/opname/${outletId}/continue`)
  }

  return <StockOpnameForm outlet={outlet} staffId={data.user.id} />
}
