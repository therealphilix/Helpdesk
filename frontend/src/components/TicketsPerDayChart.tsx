import { useQuery } from "@tanstack/react-query"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { apiClient } from "../api/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { TicketsPerDayEntry } from "../lib/tickets"

const chartConfig = {
  tickets: {
    label: "Tickets",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function TicketsPerDayChart() {
  const { data, isLoading, isError, error } = useQuery<TicketsPerDayEntry[]>({
    queryKey: ["tickets-per-day"],
    queryFn: async () => {
      const response = await apiClient.get("/dashboard/tickets-per-day")
      return response.data.data
    },
  })

  if (isLoading) {
    return (
      <Card className="paper-sheet perforated-top">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error
            ? error.message
            : "Failed to load ticket chart data."}
        </AlertDescription>
      </Alert>
    )
  }

  if (!data || data.length === 0) {
    return null
  }

  return (
    <Card className="paper-sheet perforated-top">
      <CardHeader className="border-b border-dashed border-border">
        <p className="eyebrow">Postmark volume</p>
        <CardTitle style={{ fontFamily: "var(--font-display)" }}>Tickets Per Day</CardTitle>
        <p className="text-xs text-muted-foreground">Last 14 days • stamped on arrival</p>
      </CardHeader>
      <CardContent className="pt-6">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 6" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickFormatter={(value: string) => {
                const d = new Date(value)
                return d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.3 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(String(value)).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                />
              }
            />
            <Bar
              dataKey="count"
              name="tickets"
              fill="var(--primary)"
              fillOpacity={0.9}
              radius={[6,6,0,0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
