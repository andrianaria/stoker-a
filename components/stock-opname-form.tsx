"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Building2, Package, Save, CheckCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface StockOpnameFormProps {
  outlet: any
  staffId: string
  existingOpname?: any
}

export function StockOpnameForm({ outlet, staffId, existingOpname }: StockOpnameFormProps) {
  const [opnameId, setOpnameId] = useState(existingOpname?.id)
  const [itemCounts, setItemCounts] = useState<Record<string, { counted: number; notes: string }>>({})
  const [generalNotes, setGeneralNotes] = useState(existingOpname?.notes || "")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Initialize with existing data if continuing
    if (existingOpname?.stock_opname_details) {
      const existingCounts: Record<string, { counted: number; notes: string }> = {}
      existingOpname.stock_opname_details.forEach((detail: any) => {
        existingCounts[detail.item_id] = {
          counted: detail.counted_stock || 0,
          notes: detail.notes || "",
        }
      })
      setItemCounts(existingCounts)
    }
  }, [existingOpname])

  const handleItemCountChange = (itemId: string, field: "counted" | "notes", value: string | number) => {
    setItemCounts((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: field === "counted" ? Number(value) : value,
      },
    }))
  }

  const saveProgress = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const today = new Date().toISOString().split("T")[0]

      let currentOpnameId = opnameId

      // Create or update main opname record
      if (!currentOpnameId) {
        const { data: newOpname, error: opnameError } = await supabase
          .from("stock_opnames")
          .insert([
            {
              staff_id: staffId,
              outlet_id: outlet.id,
              opname_date: today,
              status: "in_progress",
              total_items: outlet.items.length,
              notes: generalNotes,
            },
          ])
          .select()
          .single()

        if (opnameError) throw opnameError
        currentOpnameId = newOpname.id
        setOpnameId(currentOpnameId)
      } else {
        const { error: updateError } = await supabase
          .from("stock_opnames")
          .update({ notes: generalNotes })
          .eq("id", currentOpnameId)

        if (updateError) throw updateError
      }

      // Save item details
      for (const item of outlet.items) {
        const count = itemCounts[item.id]
        if (count && count.counted >= 0) {
          const difference = count.counted - (item.previous_stock || 0)

          const { error: detailError } = await supabase.from("stock_opname_details").upsert([
            {
              stock_opname_id: currentOpnameId,
              item_id: item.id,
              previous_stock: item.previous_stock || 0,
              counted_stock: count.counted,
              difference: difference,
              notes: count.notes,
            },
          ])

          if (detailError) throw detailError
        }
      }
    } catch (error: any) {
      console.error("Error saving progress:", error)
      alert("Error saving progress: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const completeOpname = async () => {
    setIsLoading(true)
    try {
      await saveProgress()

      const supabase = createClient()

      // Mark as completed
      const { error: completeError } = await supabase
        .from("stock_opnames")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", opnameId)

      if (completeError) throw completeError

      router.push("/staff/opname")
    } catch (error: any) {
      console.error("Error completing opname:", error)
      alert("Error completing opname: " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const allItemsCounted = outlet.items.every((item: any) => itemCounts[item.id] && itemCounts[item.id].counted >= 0)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/staff/opname">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">{outlet.name} - Stock Opname</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveProgress} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Progress"}
            </Button>
            <Button
              onClick={completeOpname}
              disabled={!allItemsCounted || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isLoading ? "Completing..." : "Complete Opname"}
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Item Count</h2>
          <p className="text-muted-foreground">Count each item and record any discrepancies</p>
          <div className="mt-2">
            <Badge variant={allItemsCounted ? "default" : "secondary"}>
              {Object.keys(itemCounts).length} of {outlet.items.length} items counted
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {outlet.items.map((item: any) => {
              const count = itemCounts[item.id] || { counted: 0, notes: "" }
              const difference = count.counted - (item.previous_stock || 0)
              const isCounted = count.counted >= 0 && itemCounts[item.id]

              return (
                <Card key={item.id} className={isCounted ? "border-green-200" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {item.name}
                      </CardTitle>
                      {isCounted && <CheckCircle className="h-5 w-5 text-green-600" />}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      SKU: {item.sku} | Category: {item.category} | Unit: {item.unit}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Previous Stock</Label>
                        <div className="font-medium">{item.previous_stock || 0}</div>
                      </div>
                      <div>
                        <Label htmlFor={`count-${item.id}`}>Counted Stock *</Label>
                        <Input
                          id={`count-${item.id}`}
                          type="number"
                          min="0"
                          value={count.counted}
                          onChange={(e) => handleItemCountChange(item.id, "counted", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Difference</Label>
                        <div
                          className={`font-medium ${
                            difference > 0 ? "text-green-600" : difference < 0 ? "text-red-600" : "text-gray-600"
                          }`}
                        >
                          {difference > 0 ? "+" : ""}
                          {difference}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`notes-${item.id}`}>Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${item.id}`}
                        placeholder="Any observations or reasons for discrepancies..."
                        value={count.notes}
                        onChange={(e) => handleItemCountChange(item.id, "notes", e.target.value)}
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle>General Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Overall observations, issues encountered, or additional comments..."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  rows={6}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
