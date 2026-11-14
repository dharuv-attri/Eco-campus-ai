import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authorizeApi, clientIp, enforceSameOrigin, apiError, rateLimit } from "@/lib/http";
import { run } from "@/lib/db";
import { nowIso } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { createSupabaseAdminClient, getStorageBucketName, isSupabaseStorageConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

function detectType(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

async function ensurePublicBucket(storage: SupabaseClient["storage"], bucket: string) {
  const { data, error } = await storage.getBucket(bucket);
  if (!error && data) return;
  const { error: createError } = await storage.createBucket(bucket, { public: true });
  // A concurrent request may have created it first; only fail on real errors.
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message);
  }
}

async function storeInSupabase(bytes: Uint8Array, storedName: string, mime: string) {
  const admin = createSupabaseAdminClient();
  const bucket = getStorageBucketName();
  await ensurePublicBucket(admin.storage, bucket);
  const { error } = await admin.storage.from(bucket).upload(storedName, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return {
    async remove() {
      const { error: cleanupError } = await admin.storage.from(bucket).remove([storedName]);
      if (cleanupError) {
        console.error("Could not remove the unregistered Supabase upload:", cleanupError.message);
      }
    },
  };
}

async function storeOnLocalDisk(bytes: Uint8Array, storedName: string) {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const target = path.join(uploadDir, storedName);
  if (!target.startsWith(uploadDir + path.sep)) {
    throw new Error("Invalid upload path.");
  }
  await writeFile(target, bytes);
  return {
    async remove() {
      await unlink(target).catch(() => undefined);
    },
  };
}

export async function POST(req: NextRequest) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi();
  if (auth.response) return auth.response;
  const user = auth.user;

  if (!(await rateLimit(`upload:${user.id}:${clientIp(req)}`, 40, 15 * 60 * 1000)).allowed) {
    return apiError("Too many uploads. Please wait a few minutes.", 429);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid upload request.");
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return apiError("Choose an image to upload.");
  if (file.size <= 0) return apiError("The selected file is empty.");
  if (file.size > MAX_BYTES) return apiError("Images must be 5 MB or smaller.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectType(bytes);
  if (!type) return apiError("Only JPEG, PNG or WebP images are accepted.");

  const storedName = `${randomUUID()}.${type.ext}`;

  const useSupabaseStorage = isSupabaseStorageConfigured();
  if (!useSupabaseStorage && process.env.NODE_ENV === "production") {
    console.error(
      "Upload rejected: SUPABASE_SERVICE_ROLE_KEY is not set, so persistent Supabase Storage is unavailable in production.",
    );
    return apiError(
      "Image uploads are not configured on this deployment. The administrator must set SUPABASE_SERVICE_ROLE_KEY.",
      503,
    );
  }

  let stored: { remove: () => Promise<void> };
  try {
    stored = useSupabaseStorage
      ? await storeInSupabase(bytes, storedName, type.mime)
      : await storeOnLocalDisk(bytes, storedName);
  } catch (error) {
    console.error(
      useSupabaseStorage
        ? "Could not store uploaded image in Supabase Storage:"
        : "Could not store uploaded image on local disk:",
      error instanceof Error ? error.message : error,
    );
    return apiError("The image could not be stored. Please try again.", 500);
  }

  try {
    await run(
      `INSERT INTO uploaded_files (id, owner_id, stored_name, original_name, mime, size, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      user.id,
      storedName,
      file.name.slice(0, 200) || storedName,
      type.mime,
      file.size,
      nowIso(),
    );
  } catch (error) {
    await stored.remove();
    throw error;
  }
  await logAudit({
    actor: user,
    action: "Uploaded an image",
    entityType: "file",
    entityId: storedName,
    details: `${type.mime} · ${file.size} bytes`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, url: `/uploads/${storedName}`, mime: type.mime, size: file.size });
}
