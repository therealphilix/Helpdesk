import { useRef, useState } from "react"
import { Search } from "lucide-react"
import { TicketStatus, TicketCategory } from "../lib/tickets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface TicketFilters {
  search: string
  status: string
  category: string
}

interface TicketFiltersBarProps {
  filters: TicketFilters
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onClear: () => void
}

export function TicketFiltersBar({
  filters,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onClear,
}: TicketFiltersBarProps) {
  const [searchInput, setSearchInput] = useState("")
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasFilter = filters.search || filters.status || filters.category

  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => onSearchChange(value), 300)
  }

  function handleClear() {
    setSearchInput("")
    onClear()
  }

  return (
    <div className="paper-sheet rounded-xl p-4 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <label htmlFor="search" className="eyebrow">Search correspondence</label>
          <div className="relative mt-1.5">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Sender, subject..."
              className="pl-8 bg-background"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="status-filter" className="eyebrow">Status</label>
          <Select value={filters.status} onValueChange={(val) => onStatusChange(val ?? "")}>
            <SelectTrigger id="status-filter" className="mt-1.5 min-w-[140px] bg-background">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
              <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
              <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="category-filter" className="eyebrow">Category</label>
          <Select value={filters.category} onValueChange={(val) => onCategoryChange(val ?? "")}>
            <SelectTrigger id="category-filter" className="mt-1.5 min-w-[160px] bg-background">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value={TicketCategory.GENERAL_QUESTION}>General</SelectItem>
              <SelectItem value={TicketCategory.TECHNICAL_QUESTION}>Technical</SelectItem>
              <SelectItem value={TicketCategory.REFUND_REQUEST}>Refund</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasFilter && (
          <div className="flex items-end">
            <Button variant="outline" size="default" onClick={handleClear} className="mt-1.5">
              Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
