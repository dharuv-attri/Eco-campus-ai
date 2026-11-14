import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi, clientIp, enforceSameOrigin, apiError, rateLimit } from "@/lib/http";
import { duplicateCandidates } from "@/lib/complaints";

const schema = z.object({
  category: z.string().max(60),
  locationId: z.string().max(80).optional().or(z.literal("")),
  building: z.string().max(120).optional().or(z.literal("")),
  title: z.string().trim().max(160).default(""),
});

export async function POST(req: NextRequest) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi();
  if (auth.response) return auth.response;
  const user = auth.user;

  if (!(await rateLimit(`duplicate:${user.id}:${clientIp(req)}`, 30, 10 * 60 * 1000)).allowed) {
    return apiError("Too many duplicate checks. Please wait a moment.", 429);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return apiError("Could not check for duplicates.");

  const candidates = (await duplicateCandidates({
    userId: user.id,
    category: parsed.data.category,
    locationId: parsed.data.locationId || null,
    building: parsed.data.building || null,
    title: parsed.data.title,
  })).map((candidate) => ({
    id: candidate.id,
    complaint_code: candidate.complaint_code,
    title: candidate.title,
    status: candidate.status,
    created_at: candidate.created_at,
  }));

  return NextResponse.json({ ok: true, duplicates: candidates });
}
