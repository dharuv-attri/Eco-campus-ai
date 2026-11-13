import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { locationSchema } from "@/lib/validation";
import { all, one, run } from "@/lib/db";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { nowIso, sanitizeText, slugify } from "@/lib/utils";

export async function GET() {
  const auth = await authorizeApi(["admin", "super_admin"]);
  if (auth.response) return auth.response;
  const locations = all("SELECT * FROM campus_locations ORDER BY verified DESC, name ASC");
  return NextResponse.json({ ok: true, locations });
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
  const parsed = locationSchema.safeParse(json);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Check the location details.");
  const input = parsed.data;
  const name = sanitizeText(input.name);
  if (!name) return apiError("Location name is required.");

  if (input.id) {
    const existing = one<{ id: string }>("SELECT id FROM campus_locations WHERE id = ?", input.id);
    if (!existing) return apiError("Location not found.", 404);
    run(
      `UPDATE campus_locations SET name = ?, category = ?, building = ?, floor = ?, description = ?,
         lat = ?, lng = ?, verified = ?, updated_at = ? WHERE id = ?`,
      name,
      input.category,
      sanitizeText(input.building) || null,
      sanitizeText(input.floor) || null,
      sanitizeText(input.description) || null,
      input.lat ?? null,
      input.lng ?? null,
      input.verified ? 1 : 0,
      nowIso(),
      input.id,
    );
    logAudit({
      actor: auth.user,
      action: "Updated a campus location",
      entityType: "location",
      entityId: input.id,
      details: `${name}${input.verified ? " · verified" : " · unverified"}`,
      ip: clientIp(req),
    });
    return NextResponse.json({ ok: true, id: input.id });
  }

  const id = `loc-${randomUUID().slice(0, 8)}`;
  const qrSlug = `${slugify(name) || "location"}-${randomUUID().slice(0, 5)}`;
  run(
    `INSERT INTO campus_locations
      (id, name, category, building, floor, description, lat, lng, verified, qr_slug, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    name,
    input.category,
    sanitizeText(input.building) || null,
    sanitizeText(input.floor) || null,
    sanitizeText(input.description) || null,
    input.lat ?? null,
    input.lng ?? null,
    input.verified ? 1 : 0,
    qrSlug,
    auth.user.id,
    nowIso(),
    nowIso(),
  );
  logAudit({
    actor: auth.user,
    action: "Created a campus location",
    entityType: "location",
    entityId: id,
    details: `${name}${input.verified ? " · verified" : " · unverified"}`,
    ip: clientIp(req),
  });
  return NextResponse.json({ ok: true, id, qr_slug: qrSlug }, { status: 201 });
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
  if (!parsed.success) return apiError("Location ID is required.");

  const location = one<{ name: string }>("SELECT name FROM campus_locations WHERE id = ?", parsed.data.id);
  if (!location) return apiError("Location not found.", 404);
  run("DELETE FROM campus_locations WHERE id = ?", parsed.data.id);
  logAudit({
    actor: auth.user,
    action: "Deleted a campus location",
    entityType: "location",
    entityId: parsed.data.id,
    details: location.name,
    ip: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
