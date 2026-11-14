import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Public pages render from the database on every request (`force-dynamic`), so
 * they are never stale for long. Revalidating the shared layout as well keeps
 * the root metadata, theme colours and branding in sync even if a route is
 * later given static caching, and makes the intent explicit.
 */
export function revalidateSiteChrome() {
  revalidatePath("/", "layout");
}

export function revalidatePublicContent(paths: string[] = []) {
  revalidatePath("/", "layout");
  for (const path of new Set(["/", "/announcements", "/environmental-awareness", "/campus-map", ...paths])) {
    revalidatePath(path);
  }
}
