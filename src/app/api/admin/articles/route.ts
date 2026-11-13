import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { articleSchema } from "@/lib/validation";
import { all, one, run } from "@/lib/db";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { nowIso, sanitizeText, slugify } from "@/lib/utils";

export async function GET() {
  const auth = await authorizeApi(["admin", "super_admin"]);
  if (auth.response) return auth.response;
  return NextResponse.json({
    ok: true,
    articles: all("SELECT * FROM environmental_articles ORDER BY created_at DESC"),
  });
}

function uniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title) || "article";
  let slug = base;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const existing = one<{ id: string }>(
      "SELECT id FROM environmental_articles WHERE slug = ? AND id != ?",
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
  const parsed = articleSchema.safeParse(json);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Check the article.");
  const input = parsed.data;
  const title = sanitizeText(input.title);
  const content = sanitizeText(input.content);
  const imageUrl = sanitizeText(input.imageUrl);

  if (imageUrl && !/^\/uploads\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i.test(imageUrl) && !/^https:\/\//i.test(imageUrl)) {
    return apiError("Article image must be an uploaded image or an https URL.");
  }

  if (input.id) {
    const existing = one<{ id: string }>("SELECT id FROM environmental_articles WHERE id = ?", input.id);
    if (!existing) return apiError("Article not found.", 404);
    run(
      `UPDATE environmental_articles SET title = ?, excerpt = ?, content = ?, category = ?,
         read_minutes = ?, image_url = ?, published = ?, updated_at = ? WHERE id = ?`,
      title,
      sanitizeText(input.excerpt) || null,
      content,
      sanitizeText(input.category) || "Awareness",
      input.readMinutes,
      imageUrl || null,
      input.published ? 1 : 0,
      nowIso(),
      input.id,
    );
    logAudit({
      actor: auth.user,
      action: "Updated an awareness article",
      entityType: "article",
      entityId: input.id,
      details: title,
      ip: clientIp(req),
    });
    return NextResponse.json({ ok: true, id: input.id });
  }

  const id = randomUUID();
  run(
    `INSERT INTO environmental_articles
      (id, title, slug, excerpt, content, category, read_minutes, image_url, published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    title,
    uniqueSlug(title),
    sanitizeText(input.excerpt) || null,
    content,
    sanitizeText(input.category) || "Awareness",
    input.readMinutes,
    imageUrl || null,
    input.published ? 1 : 0,
    nowIso(),
    nowIso(),
  );
  logAudit({
    actor: auth.user,
    action: "Created an awareness article",
    entityType: "article",
    entityId: id,
    details: title,
    ip: clientIp(req),
  });
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
  if (!parsed.success) return apiError("Article ID is required.");
  run("DELETE FROM environmental_articles WHERE id = ?", parsed.data.id);
  logAudit({
    actor: auth.user,
    action: "Deleted an awareness article",
    entityType: "article",
    entityId: parsed.data.id,
    ip: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
