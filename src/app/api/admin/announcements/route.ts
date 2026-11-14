import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { announcementSchema } from "@/lib/validation";
import { all, one, run } from "@/lib/db";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { nowIso, sanitizeText, slugify } from "@/lib/utils";
import { revalidatePublicContent } from "@/lib/revalidate";

export async function GET() {
  const auth = await authorizeApi(["admin", "super_admin"]);
  if (auth.response) return auth.response;
  return NextResponse.json({
    ok: true,
    announcements: await all("SELECT * FROM announcements ORDER BY created_at DESC"),
  });
}

async function uniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title) || "announcement";
  let slug = base;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const existing = await one<{ id: string }>(
      "SELECT id FROM announcements WHERE slug = ? AND id != ?",
      slug,
      excludeId ?? "",
    );
    if (!existing) return slug;
    slug = `${base}-${attempt + 2}`;
  }
  return `${base}-${randomUUID().slice(0, 5)}`;
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
  const parsed = announcementSchema.safeParse(json);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Check the announcement.");
  const input = parsed.data;
  const title = sanitizeText(input.title);
  const content = sanitizeText(input.content);

  if (input.id) {
    const existing = await one<{ id: string }>("SELECT id FROM announcements WHERE id = ?", input.id);
    if (!existing) return apiError("Announcement not found.", 404);
    await run(
      `UPDATE announcements SET title = ?, excerpt = ?, content = ?, category = ?, published = ?, updated_at = ?
       WHERE id = ?`,
      title,
      sanitizeText(input.excerpt) || null,
      content,
      sanitizeText(input.category) || "General",
      input.published ? 1 : 0,
      nowIso(),
      input.id,
    );
    await logAudit({
      actor: auth.user,
      action: "Updated an announcement",
      entityType: "announcement",
      entityId: input.id,
      details: title,
      ip: clientIp(req),
    });
    revalidatePublicContent();
    return NextResponse.json({ ok: true, id: input.id });
  }

  const id = randomUUID();
  await run(
    `INSERT INTO announcements (id, title, slug, excerpt, content, category, published, is_demo, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    id,
    title,
    await uniqueSlug(title),
    sanitizeText(input.excerpt) || null,
    content,
    sanitizeText(input.category) || "General",
    input.published ? 1 : 0,
    auth.user.id,
    nowIso(),
    nowIso(),
  );
  await logAudit({
    actor: auth.user,
    action: "Created an announcement",
    entityType: "announcement",
    entityId: id,
    details: title,
    ip: clientIp(req),
  });
  revalidatePublicContent();
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
  if (!parsed.success) return apiError("Announcement ID is required.");
  await run("DELETE FROM announcements WHERE id = ?", parsed.data.id);
  await logAudit({
    actor: auth.user,
    action: "Deleted an announcement",
    entityType: "announcement",
    entityId: parsed.data.id,
    ip: clientIp(req),
  });
  revalidatePublicContent();
  return NextResponse.json({ ok: true });
}
