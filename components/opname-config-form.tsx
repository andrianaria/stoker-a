"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface OpnameConfigFormProps {
  outlet: any
  config?: any
}

export function OpnameConfigForm({ outlet, config }: OpnameConfigFormProps) {
  const [formData, setFormData] = useState({
    frequency_days: config?.frequency_days || 1,
    reminder_hours: config?.reminder_hours || 2,
    penalty_points_per_day: config?.penalty_points_per_day || 1,
    max_penalty_points: config?.max_penalty_points || 10,
    is_active: config?.is_active ?? true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()

      if (config) {
        // Update existing config
        const { error } = await supabase.from("opname_configs").update(formData).eq("id", config.id)

        if (error) throw error
      } else {
        // Create new config
        const { error } = await supabase.from("opname_configs").insert([{ ...formData, outlet_id: outlet.id }])

        if (error) throw error
      }

      setMessage({ type: "success", text: "Configuration saved successfully!" })
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`frequency-${outlet.id}`}>Opname Frequency</Label>
          <Select
            value={formData.frequency_days.toString()}
            onValueChange={(value) => setFormData({ ...formData, frequency_days: Number.parseInt(value) })}
          >
            <SelectTrigger id={`frequency-${outlet.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Daily</SelectItem>
              <SelectItem value="3">Every 3 days</SelectItem>
              <SelectItem value="7">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`reminder-${outlet.id}`}>Reminder Hours Before</Label>
          <Input
            id={`reminder-${outlet.id}`}
            type="number"
            min="1"
            max="24"
            value={formData.reminder_hours}
            onChange={(e) => setFormData({ ...formData, reminder_hours: Number.parseInt(e.target.value) })}
          />
        </div>

        <div>
          <Label htmlFor={`penalty-${outlet.id}`}>Penalty Points per Missed Day</Label>
          <Input
            id={`penalty-${outlet.id}`}
            type="number"
            min="1"
            max="10"
            value={formData.penalty_points_per_day}
            onChange={(e) => setFormData({ ...formData, penalty_points_per_day: Number.parseInt(e.target.value) })}
          />
        </div>

        <div>
          <Label htmlFor={`max-penalty-${outlet.id}`}>Max Penalty Points</Label>
          <Input
            id={`max-penalty-${outlet.id}`}
            type="number"
            min="5"
            max="50"
            value={formData.max_penalty_points}
            onChange={(e) => setFormData({ ...formData, max_penalty_points: Number.parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id={`active-${outlet.id}`}
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor={`active-${outlet.id}`}>Enable opname tracking for this outlet</Label>
      </div>

      {message && (
        <div
          className={`text-sm p-3 rounded-md ${
            message.type === "success"
              ? "text-green-700 bg-green-50 border border-green-200"
              : "text-red-700 bg-red-50 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Configuration"}
      </Button>
    </form>
  )
}
