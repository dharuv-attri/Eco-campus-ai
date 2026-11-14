import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getStorageBucketName, isSupabaseStorageConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;

/**
 * Serves uploaded images by name.
 *
 * Next.js serves any file that exists in `public/uploads` first, so this handler
 * only runs for images that are not on the local disk. In that case it redirects
 * to the public Supabase Storage object, which keeps `/uploads/<name>` URLs stable
 * across local development and production deployments.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  if (!SAFE_NAME.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const localDir = path.join(process.cwd(), "public", "uploads");
  const localPath = path.join(localDir, name);
  if (localPath.startsWith(localDir + path.sep)) {
    try {
      const file = await readFile(localPath);
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      return new NextResponse(new Uint8Array(file), {
        headers: {
          "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream",
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    } catch {
      // Fall through to Supabase Storage.
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (supabaseUrl && isSupabaseStorageConfigured()) {
    const bucket = getStorageBucketName();
    const target = new URL(
      `/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeURIComponent(name)}`,
      supabaseUrl,
    );
    return NextResponse.redirect(target, 307);
  }

  return new NextResponse("Not found", { status: 404 });
}
