"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, X } from "lucide-react"
import Link from "next/link"

interface ReminderBannerProps {
  staffId: string
}

export function ReminderBanner({ staffId }: ReminderBannerProps) {
  const [reminders, setReminders] = useState<any[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkReminders = async () => {
      try {
        const supabase = createClient()

        // Get staff's outlet assignments
        const { data: assignments } = await supabase
          .from("outlet_staff")
          .select(`
            outlet:outlets(
              id,
              name,
              opname_config:opname_configs(*)
            )
          `)
          .eq("staff_id", staffId)

        const today = new Date()
        const todayStr = today.toISOString().split("T")[0]
        const pendingReminders = []

        for (const assignment of assignments || []) {
          const outlet = assignment.outlet
          const config = outlet.opname_config?.[0]

          if (!config?.is_active) continue

          // Check if opname was completed today
          const { data: todayOpname } = await supabase
            .from("stock_opnames")
            .select("*")
            .eq("staff_id", staffId)
            .eq("outlet_id", outlet.id)
            .eq("opname_date", todayStr)
            .single()

          // Check last completed opname
          const { data: lastOpname } = await supabase
            .from("stock_opnames")
            .select("*")
            .eq("staff_id", staffId)
            .eq("outlet_id", outlet.id)
            .eq("status", "completed")
            .order("opname_date", { ascending: false })
            .limit(1)
            .single()

          let isOpnameRequired = false
          let daysOverdue = 0

          if (!lastOpname) {
            isOpnameRequired = true
          } else {
            const lastOpnameDate = new Date(lastOpname.opname_date)
            const daysSinceLastOpname = Math.floor((today.getTime() - lastOpnameDate.getTime()) / (1000 * 60 * 60 * 24))
            isOpnameRequired = daysSinceLastOpname >= config.frequency_days

            if (isOpnameRequired) {
              const expectedNextDate = new Date(lastOpnameDate)
              expectedNextDate.setDate(expectedNextDate.getDate() + config.frequency_days)
              daysOverdue = Math.max(
                0,
                Math.floor((today.getTime() - expectedNextDate.getTime()) / (1000 * 60 * 60 * 24)),
              )
            }
          }

          if (isOpnameRequired && !todayOpname) {
            pendingReminders.push({
              outlet_id: outlet.id,
              outlet_name: outlet.name,
              days_overdue: daysOverdue,
              frequency_days: config.frequency_days,
              is_urgent: daysOverdue > 0,
            })
          }
        }

        setReminders(pendingReminders)
      } catch (error) {
        console.error("Error checking reminders:", error)
      } finally {
        setLoading(false)
      }
    }

    checkReminders()
    // Check every 5 minutes
    const interval = setInterval(checkReminders, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [staffId])

  const handleDismiss = (outletId: string) => {
    setDismissed((prev) => new Set([...prev, outletId]))
  }

  const visibleReminders = reminders.filter((r) => !dismissed.has(r.outlet_id))

  if (loading || visibleReminders.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 mb-6">
      {visibleReminders.map((reminder) => (
        <Alert
          key={reminder.outlet_id}
          className={`border-l-4 ${
            reminder.is_urgent
              ? "border-l-red-500 bg-red-50 border-red-200"
              : "border-l-yellow-500 bg-yellow-50 border-yellow-200"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {reminder.is_urgent ? (
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {reminder.is_urgent ? "URGENT: " : "REMINDER: "}
                    Stock opname required for {reminder.outlet_name}
                  </span>
                  {reminder.is_urgent && (
                    <Badge variant="destructive" className="text-xs">
                      {reminder.days_overdue} day(s) overdue
                    </Badge>
                  )}
                </div>
                <AlertDescription className="text-sm">
                  {reminder.is_urgent
                    ? `You are ${reminder.days_overdue} day(s) behind schedule. Complete immediately to avoid additional penalties.`
                    : `Stock opname is due today. Please complete your count as soon as possible.`}
                </AlertDescription>
                <div className="mt-2">
                  <Link href={`/staff/opname/${reminder.outlet_id}/start`}>
                    <Button size="sm" className={reminder.is_urgent ? "bg-red-600 hover:bg-red-700" : ""}>
                      {reminder.is_urgent ? "Complete Now" : "Start Opname"}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(reminder.outlet_id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  )
}
