import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function TicketDetailSkeleton() {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/3 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-32 w-full mt-4" />
      </CardContent>
    </Card>
  )
}
