import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()

    // Get all staff with high penalty points
    const { data: staffWithPenalties } = await supabase
      .from("staff_penalties")
      .select(`
        staff_id,
        outlet_id,
        staff:profiles(full_name, email),
        outlet:outlets(name, manager_id)
      `)
      .eq("resolved", false)

    // Group by staff and calculate totals
    const staffPenaltyMap = new Map()

    staffWithPenalties?.forEach((penalty) => {
      const key = `${penalty.staff_id}-${penalty.outlet_id}`
      if (!staffPenaltyMap.has(key)) {
        staffPenaltyMap.set(key, {
          staff_id: penalty.staff_id,
          outlet_id: penalty.outlet_id,
          staff_name: penalty.staff.full_name,
          staff_email: penalty.staff.email,
          outlet_name: penalty.outlet.name,
          manager_id: penalty.outlet.manager_id,
          total_points: 0,
        })
      }
      staffPenaltyMap.get(key).total_points += penalty.penalty_points || 0
    })

    // Get penalty thresholds from configs
    const { data: configs } = await supabase.from("opname_configs").select("outlet_id, max_penalty_points")

    const configMap = new Map()
    configs?.forEach((config) => {
      configMap.set(config.outlet_id, config.max_penalty_points || 10)
    })

    const warningLetters = []
    const escalations = []

    // Check each staff member's penalty points
    for (const [key, staffData] of staffPenaltyMap) {
      const maxPoints = configMap.get(staffData.outlet_id) || 10

      if (staffData.total_points >= maxPoints) {
        warningLetters.push({
          staff_id: staffData.staff_id,
          outlet_id: staffData.outlet_id,
          staff_name: staffData.staff_name,
          staff_email: staffData.staff_email,
          outlet_name: staffData.outlet_name,
          total_points: staffData.total_points,
          max_points: maxPoints,
        })

        // Escalate to manager
        if (staffData.manager_id) {
          escalations.push({
            manager_id: staffData.manager_id,
            staff_id: staffData.staff_id,
            outlet_id: staffData.outlet_id,
            staff_name: staffData.staff_name,
            outlet_name: staffData.outlet_name,
            total_points: staffData.total_points,
          })
        }
      }
    }

    // In a real application, you would send emails or create notifications here
    // For now, we'll just log the actions that would be taken

    return NextResponse.json({
      success: true,
      warning_letters: warningLetters.length,
      escalations: escalations.length,
      details: {
        warning_letters: warningLetters,
        escalations: escalations,
      },
    })
  } catch (error) {
    console.error("Error applying penalties:", error)
    return NextResponse.json({ error: "Failed to apply penalties" }, { status: 500 })
  }
}
