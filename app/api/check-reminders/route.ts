import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get all active outlets with opname configs
    const { data: outlets } = await supabase
      .from("outlets")
      .select(`
        id,
        name,
        opname_config:opname_configs(*),
        outlet_staff(
          staff:profiles(id, full_name, email)
        )
      `)
      .eq("is_active", true)

    const reminders = []
    const penalties = []

    for (const outlet of outlets || []) {
      const config = outlet.opname_config?.[0]
      if (!config?.is_active) continue

      // Calculate expected opname dates based on frequency
      const today = new Date()
      const todayStr = today.toISOString().split("T")[0]

      for (const assignment of outlet.outlet_staff || []) {
        const staff = assignment.staff

        // Check if opname was completed today (if required)
        const { data: todayOpname } = await supabase
          .from("stock_opnames")
          .select("*")
          .eq("staff_id", staff.id)
          .eq("outlet_id", outlet.id)
          .eq("opname_date", todayStr)
          .single()

        // Check if opname is required today based on frequency
        const { data: lastOpname } = await supabase
          .from("stock_opnames")
          .select("*")
          .eq("staff_id", staff.id)
          .eq("outlet_id", outlet.id)
          .eq("status", "completed")
          .order("opname_date", { ascending: false })
          .limit(1)
          .single()

        let isOpnameRequired = false
        if (!lastOpname) {
          // No previous opname, required
          isOpnameRequired = true
        } else {
          const lastOpnameDate = new Date(lastOpname.opname_date)
          const daysSinceLastOpname = Math.floor((today.getTime() - lastOpnameDate.getTime()) / (1000 * 60 * 60 * 24))
          isOpnameRequired = daysSinceLastOpname >= config.frequency_days
        }

        if (isOpnameRequired && !todayOpname) {
          // Calculate how many days overdue
          let daysOverdue = 0
          if (lastOpname) {
            const lastOpnameDate = new Date(lastOpname.opname_date)
            const expectedNextDate = new Date(lastOpnameDate)
            expectedNextDate.setDate(expectedNextDate.getDate() + config.frequency_days)
            daysOverdue = Math.max(
              0,
              Math.floor((today.getTime() - expectedNextDate.getTime()) / (1000 * 60 * 60 * 24)),
            )
          }

          reminders.push({
            staff_id: staff.id,
            staff_name: staff.full_name,
            staff_email: staff.email,
            outlet_id: outlet.id,
            outlet_name: outlet.name,
            days_overdue: daysOverdue,
            frequency_days: config.frequency_days,
            reminder_hours: config.reminder_hours,
          })

          // Apply penalty if overdue
          if (daysOverdue > 0) {
            const penaltyPoints = daysOverdue * config.penalty_points_per_day

            // Check if penalty already exists for this date
            const { data: existingPenalty } = await supabase
              .from("staff_penalties")
              .select("*")
              .eq("staff_id", staff.id)
              .eq("outlet_id", outlet.id)
              .eq("penalty_date", todayStr)
              .single()

            if (!existingPenalty) {
              penalties.push({
                staff_id: staff.id,
                outlet_id: outlet.id,
                penalty_date: todayStr,
                penalty_points: penaltyPoints,
                reason: `Missed stock opname - ${daysOverdue} day(s) overdue`,
                notes: `Automatic penalty for missing opname at ${outlet.name}`,
                resolved: false,
              })
            }
          }
        }
      }
    }

    // Insert penalties
    if (penalties.length > 0) {
      const { error: penaltyError } = await supabase.from("staff_penalties").insert(penalties)
      if (penaltyError) {
        console.error("Error inserting penalties:", penaltyError)
      }
    }

    return NextResponse.json({
      success: true,
      reminders,
      penalties_applied: penalties.length,
    })
  } catch (error) {
    console.error("Error checking reminders:", error)
    return NextResponse.json({ error: "Failed to check reminders" }, { status: 500 })
  }
}
