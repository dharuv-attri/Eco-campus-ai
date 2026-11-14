import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { settingsSchema } from "@/lib/validation";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { setSetting } from "@/lib/settings";
import { authorizeApi, apiError, clientIp, enforceSameOrigin } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { safeImageUrl, sanitizeText } from "@/lib/utils";
import { revalidateSiteChrome } from "@/lib/revalidate";

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
  const parsed = settingsSchema.safeParse(json);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Check the settings values.");

  const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
  const changed: string[] = [];
  for (const [key, rawValue] of Object.entries(parsed.data.settings)) {
    if (!allowed.has(key)) continue;
    let value = sanitizeText(rawValue);
    if (key.endsWith("_color") && value && !/^#[0-9a-fA-F]{6}$/.test(value)) {
      return apiError(`${key} must be a hex colour such as #14532D.`);
    }
    if (["hero_image", "background_image", "logo_url", "favicon_url"].includes(key) && value) {
      const imageUrl = safeImageUrl(value);
      if (!imageUrl) return apiError(`${key} must be an uploaded image or a valid https URL.`);
      value = imageUrl;
    }
    if (key === "social_instagram" || key === "social_linkedin" || key === "social_youtube") {
      if (value && !/^https:\/\//i.test(value)) return apiError("Social links must start with https://");
    }
    if (key === "map_center_lat") {
      const number = Number(value);
      if (!Number.isFinite(number) || number < -90 || number > 90) return apiError("Map latitude is invalid.");
      value = String(number);
    }
    if (key === "map_center_lng") {
      const number = Number(value);
      if (!Number.isFinite(number) || number < -180 || number > 180) return apiError("Map longitude is invalid.");
      value = String(number);
    }
    await setSetting(key, value);
    changed.push(key);
  }

  await logAudit({
    actor: auth.user,
    action: "Updated website settings",
    entityType: "settings",
    details: changed.join(", ").slice(0, 900),
    ip: clientIp(req),
  });

  revalidateSiteChrome();
  return NextResponse.json({ ok: true, changed: changed.length });
}
