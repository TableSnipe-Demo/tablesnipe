import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Notification } from "@/lib/api";
import { Bell } from "lucide-react";

function formatDateTime(dt: string) {
  if (!dt) return "";
  try {
    const d = new Date(dt.includes("T") ? dt : dt.replace(" ", "T"));
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
    case "confirmed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmed</Badge>;
    case "denied":
      return <Badge className="bg-zinc-100 text-zinc-600 hover:bg-zinc-100">Skipped</Badge>;
    case "expired":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Expired</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

interface NotificationListProps {
  notifications: Notification[];
}

export function NotificationList({ notifications }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-zinc-500">
          <Bell className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
          <p>No notifications yet. Slots will appear here when found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications ({notifications.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Restaurant</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Found</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-medium">{n.restaurant_name}</TableCell>
                <TableCell>{formatDateTime(n.slot_datetime)}</TableCell>
                <TableCell>{n.party_size}</TableCell>
                <TableCell>{statusBadge(n.status)}</TableCell>
                <TableCell className="text-sm text-zinc-500">
                  {formatDateTime(n.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
