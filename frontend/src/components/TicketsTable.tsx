import { useMemo, useState } from "react"
import {
  type SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "../api/client"
import { TicketStatus } from "../lib/tickets"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TicketRow {
  id: string
  sender_email: string
  sender_name: string | null
  subject: string
  status: TicketStatus
  category: string | null
  assigned_to: string | null
  assignee_name: string | null
  created_at: string
}

const statusVariant: Record<string, "default" | "secondary" | "success"> = {
  open: "default",
  resolved: "success",
  closed: "secondary",
}

const columnHelper = createColumnHelper<TicketRow>()

const columns = [
  columnHelper.accessor("sender_name", {
    id: "sender",
    header: "Sender",
    enableSorting: true,
    cell: (info) => {
      const name = info.row.original.sender_name
      const email = info.row.original.sender_email
      return (
        <div>
          <div className="font-medium">{name || email}</div>
          {name && (
            <div className="text-xs text-muted-foreground">{email}</div>
          )}
        </div>
      )
    },
  }),
  columnHelper.accessor("subject", {
    id: "subject",
    header: "Subject",
    enableSorting: true,
    cell: (info) => (
      <span className="max-w-64 truncate">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    enableSorting: true,
    cell: (info) => (
      <Badge variant={statusVariant[info.getValue()] || "secondary"}>
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("category", {
    id: "category",
    header: "Category",
    enableSorting: true,
    cell: (info) =>
      info.getValue() ? (
        <Badge variant="secondary">{info.getValue()}</Badge>
      ) : (
        <span className="text-muted-foreground text-sm">&mdash;</span>
      ),
  }),
  columnHelper.accessor("assignee_name", {
    id: "assignee",
    header: "Assigned To",
    enableSorting: true,
    cell: (info) =>
      info.getValue() || (
        <span className="text-muted-foreground text-sm">Unassigned</span>
      ),
  }),
  columnHelper.accessor("created_at", {
    id: "created",
    header: "Created",
    enableSorting: true,
    cell: (info) => (
      <span className="text-muted-foreground">
        {new Date(info.getValue()).toLocaleDateString()}
      </span>
    ),
  }),
]

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <span className="ml-1">&#9650;</span>
  if (sorted === "desc") return <span className="ml-1">&#9660;</span>
  return <span className="ml-1 text-muted-foreground/40">&#8597;</span>
}

export function TicketsTable() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created", desc: true },
  ])

  const sortBy = sorting[0]?.id ?? "created"
  const sortDir = sorting[0]?.desc ? "desc" : "asc"

  const { data: tickets, isLoading, isError, error } = useQuery<TicketRow[]>({
    queryKey: ["tickets", { sort_by: sortBy, sort_dir: sortDir }],
    queryFn: () =>
      apiClient
        .get<TicketRow[]>("/tickets", { params: { sort_by: sortBy, sort_dir: sortDir } })
        .then((res) => res.data),
  })

  const data = useMemo(() => tickets ?? [], [tickets])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableMultiSort: false,
  })

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-64" /></TableCell>
              <TableCell><Skeleton className="h-5 w-14 rounded-md" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24 rounded-md" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load tickets."}
        </AlertDescription>
      </Alert>
    )
  }

  if (!tickets) {
    return null
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                onClick={header.column.getToggleSortingHandler()}
              >
                <span>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getCanSort() && (
                    <SortIcon sorted={header.column.getIsSorted()} />
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
              No tickets found.
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
