import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BackLinkProps {
  to: string
  children: React.ReactNode
}

export function BackLink({ to, children }: BackLinkProps) {
  const navigate = useNavigate()

  return (
    <Button
      variant="ghost"
      size="sm"
      className="mb-4"
      onClick={() => navigate({ to })}
    >
      <ArrowLeft className="mr-1 h-4 w-4" />
      {children}
    </Button>
  )
}
