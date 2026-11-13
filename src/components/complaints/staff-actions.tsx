"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Loader2,
  MessageSquare,
  PlayCircle,
  Send,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label, Textarea, FieldHint } from "@/components/ui/form";
import { postJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type StaffAction = "start" | "progress" | "resolve" | "request_info" | "note" | "archive";

const actionMeta: Record<StaffAction, { label: string; description: string; icon: typeof PlayCircle }> = {
  start: {
    label: "Start work",
    description: "Mark this report as in progress and tell the reporter work has begun.",
    icon: PlayCircle,
  },
  progress: {
    label: "Post progress",
    description: "Share an update while work continues. The reporter sees this in their timeline.",
    icon: MessageSquare,
  },
  resolve: {
    label: "Mark resolved",
    description: "Describe the completed work and attach resolution evidence for verification.",
    icon: CheckCircle2,
  },
  request_info: {
    label: "Request information",
    description: "Ask administrators for more detail. This is recorded as an internal note.",
    icon: TriangleAlert,
  },
  note: {
    label: "Internal note",
    description: "Record an internal update without changing the report status.",
    icon: Send,
  },
  archive: {
    label: "Archive report",
    description: "Remove this report from active queues and public maps while preserving its full history. An administrator can restore it.",
    icon: Trash2,
  },
};

export function StaffActions({
  complaintId,
  status,
}: {
  complaintId: string;
  status: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const isOpen = ["assigned", "in_progress", "reopened"].includes(status);
  const [action, setAction] = useState<StaffAction>(isOpen ? "start" : "note");
  const [message, setMessage] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const available = (Object.keys(actionMeta) as StaffAction[]).filter((key) => {
    if (key === "archive") return status !== "archived";
    if (key === "start" || key === "progress" || key === "resolve") return isOpen;
    return true;
  });

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Images must be 6 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body });
      const data = (await response.json()) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Upload failed.");
      setImages((prev) => [...prev, data.url as string]);
      toast.success("Photo uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      action === "archive" &&
      !window.confirm("Archive this report? Its history will be preserved and an administrator can restore it.")
    ) {
      return;
    }
    setSaving(true);
    try {
      const response = await postJson<{ message?: string }>(`/api/staff/complaints/${complaintId}/action`, {
        action,
        message,
        resolutionNotes,
        imageUrls: images,
      });
      toast.success(response.message || "Update recorded.");
      setMessage("");
      setResolutionNotes("");
      setImages([]);
      if (action === "archive") {
        router.push("/staff/tasks");
      } else {
        setAction(isOpen && action === "start" ? "progress" : "note");
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the update.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface overflow-hidden">
      <div className="border-b bg-emerald-500/[0.045] p-5">
        <h2 className="font-display text-base font-semibold">Work update</h2>
        <p className="mt-1 text-xs leading-5 text-ink-500 dark:text-ink-300">
          Every update is timestamped and visible to the reporter. Resolution requires notes before the
          administrator can verify the work.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {available.map((key) => {
            const meta = actionMeta[key];
            const Icon = meta.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAction(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  action === key
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "text-ink-500 hover:border-emerald-500/30 hover:text-ink-800 dark:text-ink-300",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4 p-5">
        <p className="rounded-xl bg-ink-50 p-3 text-[11px] leading-5 text-ink-500 dark:bg-white/5 dark:text-ink-300">
          {actionMeta[action].description}
        </p>

        {!isOpen && action !== "note" && action !== "request_info" ? (
          <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-[11px] leading-5 text-amber-800 dark:text-amber-200">
            Work actions are unavailable while this report is {status.replaceAll("_", " ")}. You can still add an
            internal note or request information.
          </p>
        ) : null}

        {action === "resolve" ? (
          <div>
            <Label htmlFor="resolution-notes">Resolution notes</Label>
            <Textarea
              id="resolution-notes"
              required
              minLength={10}
              maxLength={2000}
              value={resolutionNotes}
              onChange={(event) => setResolutionNotes(event.target.value)}
              placeholder="Describe what was repaired, replaced or cleaned, and any follow-up needed."
            />
            <FieldHint>At least 10 characters. These notes are shown to the reporter and administrators.</FieldHint>
          </div>
        ) : null}

        <div>
          <Label htmlFor="staff-message">
            {action === "resolve"
              ? "Short update (optional)"
              : action === "start"
                ? "Note (optional)"
                : action === "archive"
                  ? "Reason for archiving"
                  : "Message"}
          </Label>
          <Textarea
            id="staff-message"
            required={action !== "start" && action !== "resolve"}
            minLength={action === "archive" ? 10 : action === "start" || action === "resolve" ? undefined : 3}
            maxLength={1500}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              action === "request_info"
                ? "What information do you need from the administrator?"
                : action === "note"
                  ? "Internal note for administrators and the report record."
                  : action === "archive"
                    ? "Explain why this report is being archived."
                  : "What has been done so far?"
            }
          />
        </div>

        {action === "resolve" ? (
          <div>
            <Label>Resolution photos (optional)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((url) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Resolution evidence preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((item) => item !== url))}
                    className="absolute right-1 top-1 rounded-full bg-ink-950/70 p-0.5 text-white"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || images.length >= 5}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-[10px] font-semibold text-ink-500 transition hover:border-emerald-500/40 hover:text-emerald-700 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Add photo
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <FieldHint>Up to 5 images, JPEG/PNG/WebP, maximum 6 MB each.</FieldHint>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <p className="text-[10px] text-ink-400">
            Recorded by you · {images.length ? `${images.length} photo(s) attached` : "no photos attached"}
          </p>
          <Button type="submit" loading={saving} disabled={uploading} variant={action === "archive" ? "danger" : "primary"}>
            <Send className="h-4 w-4" /> Save update
          </Button>
        </div>
      </form>
    </section>
  );
}

export function StaffReadOnlyNotice({ status }: { status: string }) {
  return (
    <section className="surface border-dashed p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Trash2 className="hidden h-4 w-4" />
        Read-only view
      </p>
      <p className="mt-1 text-xs leading-5 text-ink-500 dark:text-ink-300">
        This report is {status.replaceAll("_", " ")} and is not assigned to you or your department. You can
        follow progress, but only the assigned team or an administrator can update the work.
      </p>
    </section>
  );
}
