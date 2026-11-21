"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Shield, TrendingDown } from "lucide-react"

interface PenaltyStatusProps {
  staffId: string
}

export function PenaltyStatus({ staffId }: PenaltyStatusProps) {
  const [penaltyData, setPenaltyData] = useState<{
    totalPoints: number
    maxPoints: number
    recentPenalties: any[]
    warningLevel: "safe" | "warning" | "danger"
  } | null>(null)

  useEffect(() => {
    const fetchPenaltyData = async () => {
      try {
        const supabase = createClient()

        // Get staff's active penalties
        const { data: penalties } = await supabase
          .from("staff_penalties")
          .select(`
            *,
            outlet:outlets(
              name,
              opname_config:opname_configs(max_penalty_points)
            )
          `)
          .eq("staff_id", staffId)
          .eq("resolved", false)
          .order("penalty_date", { ascending: false })

        const totalPoints = penalties?.reduce((sum, p) => sum + p.penalty_points, 0) || 0
        const maxPoints = penalties?.[0]?.outlet?.opname_config?.[0]?.max_penalty_points || 10

        let warningLevel: "safe" | "warning" | "danger" = "safe"
        if (totalPoints >= maxPoints) {
          warningLevel = "danger"
        } else if (totalPoints >= maxPoints * 0.7) {
          warningLevel = "warning"
        }

        setPenaltyData({
          totalPoints,
          maxPoints,
          recentPenalties: penalties?.slice(0, 3) || [],
          warningLevel,
        })
      } catch (error) {
        console.error("Error fetching penalty data:", error)
      }
    }

    fetchPenaltyData()
  }, [staffId])

  if (!penaltyData || penaltyData.totalPoints === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-green-800">
            <Shield className="h-5 w-5" />
            Good Standing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700">No penalty points. Keep up the excellent work!</p>
        </CardContent>
      </Card>
    )
  }

  const { totalPoints, maxPoints, recentPenalties, warningLevel } = penaltyData
  const progressPercentage = (totalPoints / maxPoints) * 100

  return (
    <Card
      className={`border-l-4 ${
        warningLevel === "danger"
          ? "border-l-red-500 bg-red-50 border-red-200"
          : warningLevel === "warning"
            ? "border-l-yellow-500 bg-yellow-50 border-yellow-200"
            : "border-l-green-500 bg-green-50 border-green-200"
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle
          className={`text-lg flex items-center gap-2 ${
            warningLevel === "danger"
              ? "text-red-800"
              : warningLevel === "warning"
                ? "text-yellow-800"
                : "text-green-800"
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
          Penalty Status
          <Badge
            variant={warningLevel === "danger" ? "destructive" : warningLevel === "warning" ? "default" : "secondary"}
          >
            {totalPoints}/{maxPoints} points
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Penalty Points</span>
            <span>
              {totalPoints} of {maxPoints}
            </span>
          </div>
          <Progress
            value={progressPercentage}
            className={`h-2 ${
              warningLevel === "danger"
                ? "[&>div]:bg-red-500"
                : warningLevel === "warning"
                  ? "[&>div]:bg-yellow-500"
                  : "[&>div]:bg-green-500"
            }`}
          />
        </div>

        {warningLevel === "danger" && (
          <div className="bg-red-100 border border-red-300 p-3 rounded text-sm text-red-800">
            <strong>Warning:</strong> You have reached the maximum penalty points. A formal warning letter may be
            issued. Please complete all pending opname tasks immediately.
          </div>
        )}

        {warningLevel === "warning" && (
          <div className="bg-yellow-100 border border-yellow-300 p-3 rounded text-sm text-yellow-800">
            <strong>Caution:</strong> You are approaching the penalty limit. Please ensure timely completion of stock
            opname tasks.
          </div>
        )}

        {recentPenalties.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              Recent Penalties
            </h4>
            <div className="space-y-2">
              {recentPenalties.map((penalty) => (
                <div key={penalty.id} className="text-xs bg-white/50 p-2 rounded border">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{penalty.reason}</div>
                      <div className="text-muted-foreground">{penalty.outlet.name}</div>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {penalty.penalty_points} pts
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {new Date(penalty.penalty_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
