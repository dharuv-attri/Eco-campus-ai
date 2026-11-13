"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Leaf, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/misc";
import { deleteJson, postJson } from "@/lib/client-api";
import { cn, formatDate } from "@/lib/utils";

interface ActivityRow {
  id: string;
  title: string;
  description: string | null;
  points: number;
  activity_date: string | null;
  verified: number;
  is_demo: number;
  created_at: string;
  awarded?: number;
}

interface StudentOption {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
}

const emptyForm = {
  title: "",
  description: "",
  points: "10",
  activityDate: "",
  userIds: [] as string[],
};

export function ActivityManager({
  activities,
  students,
}: {
  activities: ActivityRow[];
  students: StudentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) =>
      [student.full_name, student.email, student.department]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [students, query]);

  function toggleStudent(id: string) {
    setForm((prev) => ({
      ...prev,
      userIds: prev.userIds.includes(id)
        ? prev.userIds.filter((item) => item !== id)
        : [...prev.userIds, id],
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await postJson<{ awarded?: number }>("/api/admin/activities", {
        ...form,
        points: Number(form.points) || 10,
      });
      toast.success(
        `Activity recorded.${response.awarded ? ` ${response.awarded} student(s) received points.` : ""}`,
      );
      setOpen(false);
      setForm(emptyForm);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the activity.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(activity: ActivityRow) {
    if (
      !window.confirm(
        `Delete "${activity.title}"? Points awarded through this activity will be removed from the leaderboard.`,
      )
    ) {
      return;
    }
    try {
      await deleteJson("/api/admin/activities", { id: activity.id });
      toast.success("Activity deleted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the activity.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-500 dark:text-ink-300">
          Award points only after verifying genuine participation.
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Record activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={Leaf}
          title="No verified activities yet"
          description="Record clean-up drives, plantation days or awareness sessions to award green points."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Record activity
            </Button>
          }
        />
      ) : (
        <div className="surface overflow-hidden">
          <ul className="divide-y">
            {activities.map((activity) => (
              <li key={activity.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <Leaf className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{activity.title}</p>
                    {activity.verified ? (
                      <Badge tone="emerald">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </Badge>
                    ) : null}
                    {activity.is_demo ? <DemoBadge /> : null}
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] text-ink-500">
                    {activity.description || "No description"}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-400">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {activity.activity_date ? formatDate(activity.activity_date) : formatDate(activity.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {activity.awarded ?? 0} students
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="amber">+{activity.points} points</Badge>
                  <Button size="sm" variant="ghost" onClick={() => remove(activity)} aria-label={`Delete ${activity.title}`}>
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record a verified green activity"
        description="Each selected student receives the points once and is notified."
        className="max-w-2xl"
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="activity-title">Activity title</Label>
            <Input
              id="activity-title"
              required
              minLength={3}
              maxLength={160}
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="e.g. Hostel clean-up drive"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="activity-date">Activity date</Label>
              <Input
                id="activity-date"
                type="date"
                value={form.activityDate}
                onChange={(event) => setForm((prev) => ({ ...prev, activityDate: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="activity-points">Points per student</Label>
              <Input
                id="activity-points"
                type="number"
                min={1}
                max={500}
                value={form.points}
                onChange={(event) => setForm((prev) => ({ ...prev, points: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="activity-description">Description</Label>
            <Textarea
              id="activity-description"
              maxLength={1000}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <Label>Students who participated</Label>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                {form.userIds.length} selected
              </span>
            </div>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="Search students by name, email or department"
              />
            </div>
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border p-2">
              {filteredStudents.length === 0 ? (
                <p className="p-3 text-center text-xs text-ink-400">No matching students.</p>
              ) : (
                filteredStudents.map((student) => {
                  const checked = form.userIds.includes(student.id);
                  return (
                    <label
                      key={student.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition",
                        checked
                          ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                          : "hover:bg-ink-50 dark:hover:bg-white/5",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(student.id)}
                        className="h-3.5 w-3.5 accent-emerald-600"
                      />
                      <span className="flex-1 truncate font-medium">{student.full_name}</span>
                      <span className="truncate text-[10px] text-ink-400">{student.email}</span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="mt-1 text-[11px] text-ink-400">
              You can record the activity with no students selected, then award points later by creating another
              activity.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <Leaf className="h-4 w-4" /> Record & award points
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
