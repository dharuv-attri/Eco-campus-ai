import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sectionsSchema } from "@/lib/validation";
import { run } from "@/lib/db";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { nowIso } from "@/lib/utils";

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
  const parsed = sectionsSchema.safeParse(json);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Check the section configuration.");

  for (const section of parsed.data.sections) {
    run(
      "UPDATE website_sections SET enabled = ?, sort_order = ?, updated_at = ? WHERE key = ?",
      section.enabled ? 1 : 0,
      section.sortOrder,
      nowIso(),
      section.key,
    );
  }
  logAudit({
    actor: auth.user,
    action: "Updated homepage sections",
    entityType: "settings",
    details: parsed.data.sections.map((section) => `${section.key}:${section.enabled ? "on" : "off"}`).join(", "),
    ip: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
