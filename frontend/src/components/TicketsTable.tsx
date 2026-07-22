import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { TicketStatus } from "../lib/tickets";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TicketRow {
  id: string;
  sender_email: string;
  sender_name: string | null;
  subject: string;
  status: TicketStatus;
  category: string | null;
  assigned_to: string | null;
  assignee_name: string | null;
  created_at: string;
}

const statusVariant: Record<string, "default" | "secondary" | "success"> = {
  open: "default",
  resolved: "success",
  closed: "secondary",
};

export function TicketsTable() {
  const { data: tickets, isLoading, isError, error } = useQuery<TicketRow[]>({
    queryKey: ["tickets"],
    queryFn: () => apiClient.get<TicketRow[]>("/tickets").then((res) => res.data),
  });

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sender</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead className="text-right">Created</TableHead>
          </TableRow>
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
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load tickets."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!tickets) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sender</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead className="text-right">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No tickets found.
            </TableCell>
          </TableRow>
        ) : (
          tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <div className="font-medium">{t.sender_name || t.sender_email}</div>
                {t.sender_name && (
                  <div className="text-xs text-muted-foreground">{t.sender_email}</div>
                )}
              </TableCell>
              <TableCell className="max-w-64 truncate">{t.subject}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[t.status] || "secondary"}>
                  {t.status}
                </Badge>
              </TableCell>
              <TableCell>
                {t.category ? (
                  <Badge variant="secondary">{t.category}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">&mdash;</span>
                )}
              </TableCell>
              <TableCell>
                {t.assignee_name || (
                  <span className="text-muted-foreground text-sm">Unassigned</span>
                )}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {new Date(t.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
