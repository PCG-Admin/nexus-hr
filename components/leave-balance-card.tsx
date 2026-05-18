import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { LeaveBalance } from "@/lib/supabase/leave-service"

export function LeaveBalanceCard({ balance }: { balance: LeaveBalance }) {
  const usedPercentage = balance.totalDays > 0 ? (balance.usedDays / balance.totalDays) * 100 : 0

  // Use color from database or fallback to type-based color
  const getColorClass = () => {
    if (balance.color) {
      // Convert hex color to Tailwind-like class (simplified)
      return ""
    }
    const type = balance.leaveTypeName
    if (type.includes("Annual")) return "text-emerald-600"
    if (type.includes("Sick")) return "text-red-600"
    if (type.includes("Family")) return "text-amber-600"
    return "text-blue-600"
  }

  const getColorStyle = () => {
    if (balance.color) {
      return { color: balance.color }
    }
    return {}
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={`text-lg ${getColorClass()}`} style={getColorStyle()}>
          {balance.leaveTypeName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold">{balance.availableDays}</span>
          <span className="text-sm text-muted-foreground">/ {balance.totalDays} days</span>
        </div>
        <Progress value={100 - usedPercentage} className="h-2" />
        <p className="text-sm text-muted-foreground">{balance.usedDays} days used</p>
      </CardContent>
    </Card>
  )
}
