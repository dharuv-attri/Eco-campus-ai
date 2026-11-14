import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { departmentSchema } from "@/lib/validation";
import { all, one, run } from "@/lib/db";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { nowIso, sanitizeText, slugify } from "@/lib/utils";
import { revalidateSiteChrome } from "@/lib/revalidate";

async function uniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name) || "department";
  let slug = base;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const existing = await one<{ id: string }>(
      "SELECT id FROM departments WHERE slug = ? AND id != ?",
      slug,
      excludeId ?? "",
    );
    if (!existing) return slug;
    slug = `${base}-${attempt + 2}`;
  }
  return `${base}-${randomUUID().slice(0, 6)}`;
}

export async function POST(req: NextRequest) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi(["admin", "super_admin"]);
  if (auth.response) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = departmentSchema.safeParse(json);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Check the department details.");
  const input = parsed.data;
  const name = sanitizeText(input.name);
  if (!name) return apiError("Department name is required.");

  if (input.id) {
    const existing = await one<{ id: string }>("SELECT id FROM departments WHERE id = ?", input.id);
    if (!existing) return apiError("Department not found.", 404);
    await run(
      `UPDATE departments SET name = ?, description = ?, email = ?, handles_categories = ?, updated_at = ?
       WHERE id = ?`,
      name,
      sanitizeText(input.description) || null,
      sanitizeText(input.email) || null,
      JSON.stringify(input.handlesCategories),
      nowIso(),
      input.id,
    );
    await run("UPDATE users SET department = ? WHERE department_id = ?", name, input.id);
    await logAudit({
      actor: auth.user,
      action: "Updated a department",
      entityType: "department",
      entityId: input.id,
      details: name,
      ip: clientIp(req),
    });
    revalidateSiteChrome();
    return NextResponse.json({ ok: true, id: input.id });
  }

  const id = `dept-${randomUUID().slice(0, 8)}`;
  await run(
    `INSERT INTO departments (id, name, slug, description, handles_categories, email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    name,
    await uniqueSlug(name),
    sanitizeText(input.description) || null,
    JSON.stringify(input.handlesCategories),
    sanitizeText(input.email) || null,
    nowIso(),
    nowIso(),
  );
  await logAudit({
    actor: auth.user,
    action: "Created a department",
    entityType: "department",
    entityId: id,
    details: name,
    ip: clientIp(req),
  });
  revalidateSiteChrome();
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

const deleteSchema = z.object({ id: z.string().min(1).max(80) });

export async function DELETE(req: NextRequest) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi(["admin", "super_admin"]);
  if (auth.response) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) return apiError("Department ID is required.");

  const open = await one<{ count: number }>(
    `SELECT COUNT(*) AS count FROM complaints
     WHERE assigned_department_id = ? AND status NOT IN ('closed','rejected','verified')`,
    parsed.data.id,
  );
  if ((open?.count ?? 0) > 0) {
    return apiError("Reassign open reports before deleting this department.", 409);
  }
  await run("UPDATE users SET department_id = NULL, department = NULL WHERE department_id = ?", parsed.data.id);
  await run("DELETE FROM departments WHERE id = ?", parsed.data.id);
  await logAudit({
    actor: auth.user,
    action: "Deleted a department",
    entityType: "department",
    entityId: parsed.data.id,
    ip: clientIp(req),
  });
  revalidateSiteChrome();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const auth = await authorizeApi(["admin", "super_admin"]);
  if (auth.response) return auth.response;
  const departments = await all("SELECT * FROM departments ORDER BY name ASC");
  return NextResponse.json({ ok: true, departments });
}
