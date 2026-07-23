import { useEffect, useMemo, useState } from "react"
import {
  type SortingState,
  type PaginationState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useQuery } from "@tanstack/react-query"
import { type AxiosError } from "axios"
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
import { TicketFiltersBar, type TicketFilters } from "./TicketFilters"
import { TicketPagination } from "./TicketPagination"

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

interface PaginatedResponse {
  items: TicketRow[]
  total: number
}

function normalizeResponse(data: unknown): PaginatedResponse {
  if (Array.isArray(data)) {
    throw new Error("API returned an unexpected flat array instead of a paginated response.")
  }
  if (data && typeof data === "object" && "items" in data && "total" in data) {
    return data as PaginatedResponse
  }
  return { items: [], total: 0 }
}

const statusVariant: Record<string, "default" | "secondary" | "success"> = {
  open: "default",
  resolved: "success",
  closed: "secondary",
}

const COLUMN_TO_SORT_KEY: Record<string, string> = {
  sender: "sender_name",
  subject: "subject",
  status: "status",
  category: "category",
  assignee: "assignee_name",
  created: "created_at",
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

  const [filters, setFilters] = useState<TicketFilters>({
    search: "",
    status: "",
    category: "",
  })

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }))
  }, [filters.search, filters.status, filters.category])

  const columnId = sorting[0]?.id ?? "created"
  const sortBy = COLUMN_TO_SORT_KEY[columnId] ?? "created_at"
  const sortDir = sorting[0]?.desc ? "desc" : "asc"

  const params: Record<string, string> = {
    sort_by: sortBy,
    sort_dir: sortDir,
    limit: String(pagination.pageSize),
    offset: String(pagination.pageIndex * pagination.pageSize),
  }
  if (filters.search) params.search = filters.search
  if (filters.status) params.status = filters.status
  if (filters.category) params.category = filters.category

  const { data: paginatedData, isLoading, isError, error } = useQuery<PaginatedResponse>({
    queryKey: [
      "tickets",
      {
        sort_by: sortBy,
        sort_dir: sortDir,
        search: filters.search,
        status: filters.status,
        category: filters.category,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
      },
    ],
    queryFn: () =>
      apiClient
        .get("/tickets", { params })
        .then((res) => normalizeResponse(res.data))
        .catch((err: AxiosError<{ detail: unknown }>) => {
          const detail = err.response?.data?.detail
          if (Array.isArray(detail) && detail.length > 0) {
            const first = detail[0] as Record<string, unknown>
            const loc = (first.loc as string[])?.join(".") ?? "query"
            throw new Error(`${loc}: ${first.msg}`)
          }
          if (typeof detail === "string") {
            throw new Error(detail)
          }
          throw err
        }),
  })

  const data = useMemo(() => paginatedData?.items ?? [], [paginatedData])
  const total = paginatedData?.total ?? 0

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: Math.ceil(total / pagination.pageSize) || 1,
    enableMultiSort: false,
  })

  const filterBar = (
    <TicketFiltersBar
      filters={filters}
      onSearchChange={(search) => setFilters((p) => ({ ...p, search }))}
      onStatusChange={(status) => setFilters((p) => ({ ...p, status }))}
      onCategoryChange={(category) => setFilters((p) => ({ ...p, category }))}
      onClear={() => setFilters({ search: "", status: "", category: "" })}
    />
  )

  if (isLoading) {
    return (
      <>
        {filterBar}
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
      </>
    )
  }

  if (isError) {
    return (
      <>
        {filterBar}
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load tickets."}
          </AlertDescription>
        </Alert>
      </>
    )
  }

  if (!paginatedData) {
    return <>{filterBar}</>
  }

  return (
    <>
      {filterBar}
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
      <TicketPagination
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        total={total}
        onPageChange={(pageIndex) => setPagination((prev) => ({ ...prev, pageIndex }))}
        onPageSizeChange={(pageSize) => setPagination({ pageIndex: 0, pageSize })}
      />
    </>
  )
}
