"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/misc";
import { deleteJson, postJson } from "@/lib/client-api";
import { formatDate } from "@/lib/utils";
import type { Announcement } from "@/lib/content";

const emptyForm = {
  id: "",
  title: "",
  excerpt: "",
  category: "General",
  content: "",
  published: true,
};

export function AnnouncementManager({ announcements }: { announcements: Announcement[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function edit(item?: Announcement) {
    setForm(
      item
        ? {
            id: item.id,
            title: item.title,
            excerpt: item.excerpt ?? "",
            category: item.category,
            content: item.content,
            published: item.published === 1,
          }
        : emptyForm,
    );
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await postJson("/api/admin/announcements", form);
      toast.success(form.id ? "Announcement updated." : "Announcement published.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the announcement.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Announcement) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await deleteJson("/api/admin/announcements", { id: item.id });
      toast.success("Announcement deleted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the announcement.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => edit()}>
          <Plus className="h-4 w-4" /> New announcement
        </Button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Share platform notices, drive results or campus sustainability updates."
          action={
            <Button onClick={() => edit()}>
              <Plus className="h-4 w-4" /> New announcement
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {announcements.map((item) => (
            <div key={item.id} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <Megaphone className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.published ? <Badge tone="emerald">Published</Badge> : <Badge tone="slate">Draft</Badge>}
                  {item.is_demo ? <DemoBadge /> : null}
                  <Badge tone="amber">{item.category}</Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] text-ink-500">{item.excerpt || item.content}</p>
                <p className="mt-1 text-[10px] text-ink-400">
                  {formatDate(item.created_at)} · /announcements/{item.slug}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {item.published ? (
                  <Link
                    href={`/announcements/${item.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold text-ink-500 hover:text-forest-800 dark:hover:text-emerald-300"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => edit(item)} aria-label={`Edit ${item.title}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(item)} aria-label={`Delete ${item.title}`}>
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Edit announcement" : "New announcement"}
        description="Announcements appear on the public site when published."
        className="max-w-2xl"
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div>
              <Label htmlFor="announcement-title">Title</Label>
              <Input
                id="announcement-title"
                required
                minLength={4}
                maxLength={180}
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="announcement-category">Category</Label>
              <Input
                id="announcement-category"
                maxLength={60}
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="announcement-excerpt">Excerpt</Label>
            <Input
              id="announcement-excerpt"
              maxLength={300}
              value={form.excerpt}
              onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
              placeholder="Short summary shown in listings."
            />
          </div>
          <div>
            <Label htmlFor="announcement-content">Content</Label>
            <Textarea
              id="announcement-content"
              required
              minLength={10}
              maxLength={10000}
              className="min-h-48"
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="announcement-published">Visibility</Label>
            <Select
              id="announcement-published"
              value={form.published ? "published" : "draft"}
              onChange={(event) => setForm((prev) => ({ ...prev, published: event.target.value === "published" }))}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {form.id ? "Save changes" : "Publish announcement"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
