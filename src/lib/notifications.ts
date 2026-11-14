import "server-only";
import { randomUUID } from "node:crypto";
import { all, run } from "@/lib/db";
import { nowIso } from "@/lib/utils";
import type { Notification } from "@/types";

export async function listUserNotifications(userId: string, limit = 100): Promise<Notification[]> {
  const notifications = await all<Notification>(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    userId,
    limit,
  );
  return notifications.map((notification) => ({
    id: notification.id,
    user_id: notification.user_id,
    complaint_id: notification.complaint_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    is_read: notification.is_read,
    created_at: notification.created_at,
  }));
}

export async function notifyUser(input: {
  userId: string;
  complaintId?: string | null;
  type: string;
  title: string;
  message: string;
}) {
  await run(
    `INSERT INTO notifications (id, user_id, complaint_id, type, title, message, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    randomUUID(),
    input.userId,
    input.complaintId ?? null,
    input.type,
    input.title.slice(0, 140),
    input.message.slice(0, 600),
    nowIso(),
  );
}

export async function notifyAdmins(input: {
  complaintId?: string | null;
  type: string;
  title: string;
  message: string;
}) {
  const admins = await all<{ id: string }>(
    "SELECT id FROM users WHERE role IN ('admin','super_admin') AND status = 'active'",
  );
  for (const admin of admins) {
    await notifyUser({ ...input, userId: admin.id });
  }
}

export async function notifyDepartmentStaff(input: {
  departmentId: string;
  complaintId?: string | null;
  type: string;
  title: string;
  message: string;
}) {
  const staff = await all<{ id: string }>(
    "SELECT id FROM users WHERE role = 'staff' AND status = 'active' AND department_id = ?",
    input.departmentId,
  );
  for (const member of staff) {
    await notifyUser({ ...input, userId: member.id });
  }
}
