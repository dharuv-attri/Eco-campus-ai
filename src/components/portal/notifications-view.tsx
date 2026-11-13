"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Circle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { postJson } from "@/lib/client-api";
import { cn, timeAgo } from "@/lib/utils";
import type { Notification } from "@/types";

export function NotificationsView({
  notifications,
  detailBase,
}: {
  notifications: Notification[];
  detailBase: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(notifications);
  const unread = items.filter((item) => item.is_read === 0).length;

  async function markAll() {
    setBusy(true);
    try {
      await postJson("/api/notifications", { action: "read_all" });
      setItems((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
      toast.success("All notifications marked as read.");
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function markOne(id: string) {
    try {
      await postJson("/api/notifications", { action: "read", id });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: 1 } : item)));
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the notification.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500 dark:text-ink-300">
          {unread ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "You're all caught up."}
        </p>
        <Button variant="outline" size="sm" onClick={markAll} loading={busy} disabled={!unread || pending}>
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Status changes, staff updates and green points will appear here."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "surface flex items-start gap-3 p-4 transition",
                item.is_read === 0 && "border-emerald-500/30 bg-emerald-500/[0.035]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  item.is_read === 0
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-ink-100 text-ink-400 dark:bg-white/5",
                )}
              >
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.is_read === 0 ? <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" /> : null}
                  <span className="ml-auto text-[10px] text-ink-400">{timeAgo(item.created_at)}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-ink-500 dark:text-ink-300">{item.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {item.complaint_id ? (
                    <Link
                      href={`${detailBase}/${item.complaint_id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-800 hover:underline dark:text-emerald-300"
                    >
                      View report <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : null}
                  {item.is_read === 0 ? (
                    <button
                      type="button"
                      onClick={() => markOne(item.id)}
                      className="text-[11px] font-medium text-ink-400 hover:text-ink-700 hover:underline"
                    >
                      Mark as read
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
