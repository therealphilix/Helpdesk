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
    color: "var(--chart-1)",
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
      <Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Tickets Per Day</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                const d = new Date(value)
                return d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
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
              fill="var(--foreground)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
