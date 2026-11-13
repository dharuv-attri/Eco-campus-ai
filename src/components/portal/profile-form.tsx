"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldHint } from "@/components/ui/form";
import { patchJson } from "@/lib/client-api";
import { ROLE_LABEL } from "@/lib/constants";
import type { SessionUser } from "@/types";

export function ProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    fullName: user.fullName,
    studentId: user.studentId ?? "",
    course: user.course ?? "",
    department: user.department ?? "",
    yearSemester: user.yearSemester ?? "",
    employeeId: user.employeeId ?? "",
    designation: user.designation ?? "",
    profileImage: user.profileImage ?? "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile images must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body });
      const data = (await response.json()) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Upload failed.");
      update("profileImage", data.url);
      toast.success("Image uploaded. Save changes to apply it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await patchJson("/api/profile", form);
      toast.success("Profile updated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="surface h-fit p-5 text-center">
        <div className="relative mx-auto w-fit">
          <Avatar name={form.fullName} src={form.profileImage || null} size="xl" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-forest-800 text-white shadow-md ring-2 ring-white transition hover:bg-forest-700 dark:ring-[#101f19]"
            aria-label="Upload profile photo"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
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
        </div>
        <p className="mt-3 font-display text-base font-semibold">{user.fullName}</p>
        <p className="text-xs text-ink-500">{user.email}</p>
        <span className="mt-2 inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
          {ROLE_LABEL[user.role] ?? user.role}
        </span>
        {user.department ? <p className="mt-3 text-xs text-ink-500">{user.department}</p> : null}
      </div>

      <div className="surface space-y-4 p-5 sm:p-6">
        <div>
          <Label htmlFor="profile-name">Full name</Label>
          <Input
            id="profile-name"
            required
            value={form.fullName}
            onChange={(event) => update("fullName", event.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {user.role === "student" ? (
            <>
              <div>
                <Label htmlFor="profile-student-id">Student ID</Label>
                <Input
                  id="profile-student-id"
                  value={form.studentId}
                  onChange={(event) => update("studentId", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="profile-course">Course</Label>
                <Input
                  id="profile-course"
                  value={form.course}
                  onChange={(event) => update("course", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="profile-department">Department / school</Label>
                <Input
                  id="profile-department"
                  value={form.department}
                  onChange={(event) => update("department", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="profile-year">Year / semester</Label>
                <Input
                  id="profile-year"
                  value={form.yearSemester}
                  onChange={(event) => update("yearSemester", event.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="profile-employee-id">Employee ID</Label>
                <Input
                  id="profile-employee-id"
                  value={form.employeeId}
                  onChange={(event) => update("employeeId", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="profile-designation">Designation</Label>
                <Input
                  id="profile-designation"
                  value={form.designation}
                  onChange={(event) => update("designation", event.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="profile-department-name">Department</Label>
                <Input
                  id="profile-department-name"
                  value={form.department}
                  onChange={(event) => update("department", event.target.value)}
                  disabled
                />
                <FieldHint>Department membership is managed by an administrator.</FieldHint>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end border-t pt-4">
          <Button type="submit" loading={saving}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        </div>
      </div>
    </form>
  );
}
