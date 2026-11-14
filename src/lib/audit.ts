import "server-only";
import { randomUUID } from "node:crypto";
import { run } from "@/lib/db";
import { nowIso } from "@/lib/utils";
import type { SessionUser } from "@/types";

export async function logAudit(input: {
  actor?: SessionUser | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ip?: string;
}) {
  await run(
    `INSERT INTO admin_audit_logs (id, actor_id, actor_name, action, entity_type, entity_id, details, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    input.actor?.id ?? null,
    input.actor?.fullName ?? "System",
    input.action.slice(0, 120),
    input.entityType?.slice(0, 80) ?? null,
    input.entityId?.slice(0, 80) ?? null,
    input.details?.slice(0, 1000) ?? null,
    input.ip?.slice(0, 80) ?? null,
    nowIso(),
  );
}
