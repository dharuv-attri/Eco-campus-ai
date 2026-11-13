"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/misc";
import { deleteJson, postJson } from "@/lib/client-api";
import { PROBLEM_CATEGORIES } from "@/lib/constants";
import { categoryLabel, cn, parseJsonSafe } from "@/lib/utils";
import type { Department } from "@/types";

interface DepartmentRow extends Department {
  staff_count?: number;
  open_count?: number;
}

const emptyForm = {
  id: "",
  name: "",
  description: "",
  email: "",
  handlesCategories: [] as string[],
};

export function DepartmentManager({ departments }: { departments: DepartmentRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function edit(department?: DepartmentRow) {
    if (!department) {
      setForm(emptyForm);
    } else {
      setForm({
        id: department.id,
        name: department.name,
        description: department.description ?? "",
        email: department.email ?? "",
        handlesCategories: parseJsonSafe<string[]>(department.handles_categories, []),
      });
    }
    setOpen(true);
  }

  function toggleCategory(value: string) {
    setForm((prev) => ({
      ...prev,
      handlesCategories: prev.handlesCategories.includes(value)
        ? prev.handlesCategories.filter((item) => item !== value)
        : [...prev.handlesCategories, value],
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await postJson("/api/admin/departments", form);
      toast.success(form.id ? "Department updated." : "Department created.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the department.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(department: DepartmentRow) {
    if (!window.confirm(`Delete ${department.name}? Open reports must be reassigned first.`)) return;
    try {
      await deleteJson("/api/admin/departments", { id: department.id });
      toast.success("Department deleted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the department.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => edit()}>
          <Plus className="h-4 w-4" /> Add department
        </Button>
      </div>

      {departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments configured"
          description="Create a department so reports can be assigned to the right campus team."
          action={
            <Button onClick={() => edit()}>
              <Plus className="h-4 w-4" /> Add department
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => {
            const categories = parseJsonSafe<string[]>(department.handles_categories, []);
            return (
              <div key={department.id} className="surface flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => edit(department)} aria-label={`Edit ${department.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(department)} aria-label={`Delete ${department.name}`}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </Button>
                  </div>
                </div>
                <h3 className="mt-3 font-display text-base font-semibold">{department.name}</h3>
                <p className="mt-1 flex-1 text-xs leading-5 text-ink-500 dark:text-ink-300">
                  {department.description || "No description yet."}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {categories.slice(0, 4).map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-300"
                    >
                      {categoryLabel(category)}
                    </span>
                  ))}
                  {categories.length > 4 ? (
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-500 dark:bg-white/5">
                      +{categories.length - 4}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3 text-[11px] text-ink-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> {department.staff_count ?? 0} staff
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> {department.open_count ?? 0} open
                  </span>
                  {department.email ? (
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5" /> {department.email}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Edit department" : "Add department"}
        description="Departments receive assigned reports and their staff are notified about new work."
        className="max-w-2xl"
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="department-name">Name</Label>
              <Input
                id="department-name"
                required
                minLength={2}
                maxLength={120}
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="department-email">Contact email</Label>
              <Input
                id="department-email"
                type="email"
                maxLength={160}
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="department@example.edu"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="department-description">Description</Label>
            <Textarea
              id="department-description"
              maxLength={500}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="What infrastructure or services does this team maintain?"
            />
          </div>
          <div>
            <Label>Handled categories</Label>
            <div className="mt-2 grid max-h-64 gap-1.5 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2">
              {PROBLEM_CATEGORIES.map((category) => {
                const checked = form.handlesCategories.includes(category.value);
                return (
                  <label
                    key={category.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition",
                      checked ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200" : "hover:bg-ink-50 dark:hover:bg-white/5",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(category.value)}
                      className="h-3.5 w-3.5 accent-emerald-600"
                    />
                    {category.label}
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-ink-400">
              New reports in these categories suggest this department during assignment.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {form.id ? "Save changes" : "Create department"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
