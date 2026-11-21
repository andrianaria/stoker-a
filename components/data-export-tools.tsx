"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, FileText, Database } from "lucide-react"
import type { DateRange } from "react-day-picker"

export function DataExportTools() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [exportType, setExportType] = useState("all")
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const availableTables = [
    { id: "stock_opnames", name: "Stock Opnames", description: "All stock counting records" },
    { id: "stock_opname_details", name: "Opname Details", description: "Individual item counts and differences" },
    { id: "staff_penalties", name: "Staff Penalties", description: "Penalty records and points" },
    { id: "audit_logs", name: "Audit Logs", description: "System activity and changes" },
    { id: "outlets", name: "Outlets", description: "Outlet information and configurations" },
    { id: "profiles", name: "User Profiles", description: "User accounts and roles" },
    { id: "items", name: "Items", description: "Inventory item master data" },
  ]

  const handleTableSelection = (tableId: string, checked: boolean) => {
    if (checked) {
      setSelectedTables([...selectedTables, tableId])
    } else {
      setSelectedTables(selectedTables.filter((id) => id !== tableId))
    }
  }

  const exportData = async () => {
    setIsExporting(true)
    try {
      const supabase = createClient()

      // Build query based on selections
      let query = supabase.from("stock_opnames").select("*")

      if (dateRange?.from) {
        query = query.gte("opname_date", dateRange.from.toISOString().split("T")[0])
      }
      if (dateRange?.to) {
        query = query.lte("opname_date", dateRange.to.toISOString().split("T")[0])
      }

      const { data, error } = await query

      if (error) throw error

      // Convert to CSV
      if (data && data.length > 0) {
        const headers = Object.keys(data[0])
        const csvContent = [
          headers.join(","),
          ...data.map((row) =>
            headers
              .map((header) => {
                const value = row[header]
                return typeof value === "string" && value.includes(",") ? `"${value}"` : value
              })
              .join(","),
          ),
        ].join("\n")

        // Download file
        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `stock_opname_export_${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Export error:", error)
      alert("Export failed. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const generateComplianceReport = async () => {
    setIsExporting(true)
    try {
      const supabase = createClient()

      // Get comprehensive compliance data
      const [{ data: opnames }, { data: penalties }, { data: outlets }, { data: staff }] = await Promise.all([
        supabase.from("stock_opnames").select(`
          *,
          outlet:outlets(name),
          staff:profiles(full_name, email)
        `),
        supabase.from("staff_penalties").select(`
          *,
          staff:profiles(full_name, email),
          outlet:outlets(name)
        `),
        supabase.from("outlets").select("*"),
        supabase.from("profiles").select("*").eq("role", "staff"),
      ])

      // Generate report data
      const reportData = {
        generated_at: new Date().toISOString(),
        summary: {
          total_outlets: outlets?.length || 0,
          total_staff: staff?.length || 0,
          total_opnames: opnames?.length || 0,
          completed_opnames: opnames?.filter((o) => o.status === "completed").length || 0,
          total_penalties: penalties?.length || 0,
          total_penalty_points: penalties?.reduce((sum, p) => sum + p.penalty_points, 0) || 0,
        },
        opnames: opnames || [],
        penalties: penalties || [],
        outlets: outlets || [],
        staff: staff || [],
      }

      // Download JSON report
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `compliance_report_${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Report generation error:", error)
      alert("Report generation failed. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Export Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Quick Exports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={generateComplianceReport} disabled={isExporting} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              {isExporting ? "Generating..." : "Generate Compliance Report"}
            </Button>
            <Button variant="outline" onClick={exportData} disabled={isExporting} className="w-full bg-transparent">
              <Database className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export Stock Opname Data"}
            </Button>
          </CardContent>
        </Card>

        {/* Export Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Export Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Date Range</label>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
            <div>
              <label className="text-sm font-medium">Export Format</label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV Format</SelectItem>
                  <SelectItem value="json">JSON Format</SelectItem>
                  <SelectItem value="excel">Excel Format</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Data Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {availableTables.map((table) => (
              <div key={table.id} className="flex items-start space-x-3 p-3 border rounded">
                <Checkbox
                  id={table.id}
                  checked={selectedTables.includes(table.id)}
                  onCheckedChange={(checked) => handleTableSelection(table.id, checked as boolean)}
                />
                <div className="flex-1">
                  <label htmlFor={table.id} className="text-sm font-medium cursor-pointer">
                    {table.name}
                  </label>
                  <p className="text-xs text-muted-foreground">{table.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Export Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={exportData} disabled={isExporting || selectedTables.length === 0} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export Selected Data"}
            </Button>
            <Button variant="outline" onClick={() => setSelectedTables(availableTables.map((t) => t.id))}>
              Select All
            </Button>
            <Button variant="outline" onClick={() => setSelectedTables([])}>
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
