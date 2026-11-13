"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, ExternalLink, ImageIcon, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/misc";
import { deleteJson, postJson } from "@/lib/client-api";
import { formatDate } from "@/lib/utils";
import type { Article } from "@/lib/content";

const emptyForm = {
  id: "",
  title: "",
  excerpt: "",
  category: "Awareness",
  content: "",
  readMinutes: "4",
  imageUrl: "",
  published: true,
};

export function ArticleManager({ articles }: { articles: Article[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function edit(item?: Article) {
    setForm(
      item
        ? {
            id: item.id,
            title: item.title,
            excerpt: item.excerpt ?? "",
            category: item.category,
            content: item.content,
            readMinutes: String(item.read_minutes),
            imageUrl: item.image_url ?? "",
            published: item.published === 1,
          }
        : emptyForm,
    );
    setOpen(true);
  }

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
      setForm((prev) => ({ ...prev, imageUrl: data.url as string }));
      toast.success("Cover image uploaded. Save to apply it.");
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
      await postJson("/api/admin/articles", {
        ...form,
        readMinutes: Number(form.readMinutes) || 4,
      });
      toast.success(form.id ? "Article updated." : "Article created.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the article.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Article) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await deleteJson("/api/admin/articles", { id: item.id });
      toast.success("Article deleted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the article.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => edit()}>
          <Plus className="h-4 w-4" /> New article
        </Button>
      </div>

      {articles.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No awareness articles"
          description="Publish practical guides about water, energy, waste and biodiversity."
          action={
            <Button onClick={() => edit()}>
              <Plus className="h-4 w-4" /> New article
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {articles.map((item) => (
            <div key={item.id} className="surface flex gap-4 p-4">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt="" className="h-20 w-20 shrink-0 rounded-xl border object-cover" />
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <BookOpen className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.published ? <Badge tone="emerald">Published</Badge> : <Badge tone="slate">Draft</Badge>}
                  <Badge tone="sky">{item.category}</Badge>
                  <span className="text-[10px] text-ink-400">{item.read_minutes} min</span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-[10px] text-ink-400">{formatDate(item.created_at)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {item.published ? (
                    <Link
                      href={`/environmental-awareness/${item.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold text-ink-500 hover:text-forest-800 dark:hover:text-emerald-300"
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
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Edit awareness article" : "New awareness article"}
        className="max-w-3xl"
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="article-title">Title</Label>
            <Input
              id="article-title"
              required
              minLength={4}
              maxLength={180}
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="article-category">Category</Label>
              <Input
                id="article-category"
                maxLength={60}
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="article-minutes">Read minutes</Label>
              <Input
                id="article-minutes"
                type="number"
                min={1}
                max={60}
                value={form.readMinutes}
                onChange={(event) => setForm((prev) => ({ ...prev, readMinutes: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="article-published">Visibility</Label>
              <Select
                id="article-published"
                value={form.published ? "published" : "draft"}
                onChange={(event) => setForm((prev) => ({ ...prev, published: event.target.value === "published" }))}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="article-excerpt">Excerpt</Label>
            <Textarea
              id="article-excerpt"
              maxLength={300}
              className="min-h-20"
              value={form.excerpt}
              onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
            />
          </div>
          <div>
            <Label>Cover image (optional)</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={form.imageUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                placeholder="/uploads/… or https://…"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="shrink-0"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload
              </Button>
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
            {form.imageUrl ? (
              <div className="mt-2 flex items-center gap-2 rounded-xl border p-2">
                <ImageIcon className="h-4 w-4 text-ink-400" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt="Cover preview" className="h-12 w-24 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, imageUrl: "" }))}
                  className="ml-auto text-[11px] font-medium text-rose-600"
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>
          <div>
            <Label htmlFor="article-content">Content</Label>
            <Textarea
              id="article-content"
              required
              minLength={10}
              maxLength={20000}
              className="min-h-64"
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            />
            <p className="mt-1 text-[11px] text-ink-400">
              Plain text with paragraph breaks. HTML is stripped on save for security.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {form.id ? "Save changes" : "Create article"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
