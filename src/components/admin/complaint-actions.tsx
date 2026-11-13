"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Flag,
  LockKeyhole,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UserRoundSearch,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea, Input, FieldHint } from "@/components/ui/form";
import { postJson } from "@/lib/client-api";
import { PRIORITIES, STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AdminAction =
  | "review"
  | "assign"
  | "priority"
  | "status"
  | "note"
  | "reject"
  | "verify"
  | "close"
  | "reopen"
  | "restore"
  | "delete_demo";

interface DepartmentOption {
  id: string;
  name: string;
}

interface StaffOption {
  id: string;
  full_name: string;
  department_id: string | null;
}

const actions: Array<{
  key: AdminAction;
  label: string;
  description: string;
  icon: typeof ClipboardCheck;
}> = [
  { key: "review", label: "Review", description: "Move a new report into review and notify the reporter.", icon: ClipboardCheck },
  { key: "assign", label: "Assign", description: "Route the work to a department and optionally a staff member.", icon: Building2 },
  { key: "priority", label: "Priority", description: "Set the urgency of the report.", icon: Flag },
  { key: "status", label: "Set status", description: "Manually move the report to an allowed status.", icon: LockKeyhole },
  { key: "note", label: "Internal note", description: "Record private notes for administrators.", icon: MessageSquare },
  { key: "verify", label: "Verify", description: "Confirm completed work and award green points.", icon: BadgeCheck },
  { key: "close", label: "Close", description: "Close a resolved or verified report.", icon: CheckCircle2 },
  { key: "reject", label: "Reject", description: "Decline a report with a clear reason.", icon: XCircle },
  { key: "reopen", label: "Reopen", description: "Reopen a closed, resolved or rejected report.", icon: RotateCcw },
  { key: "restore", label: "Restore", description: "Restore an archived report to its previous status.", icon: RotateCcw },
  { key: "delete_demo", label: "Delete demo", description: "Permanently delete a demo-only record.", icon: Trash2 },
];

export function AdminComplaintActions({
  complaintId,
  status,
  priority,
  departmentId,
  staffId,
  isDemo,
  departments,
  staff,
}: {
  complaintId: string;
  status: string;
  priority: string;
  departmentId: string | null;
  staffId: string | null;
  isDemo: boolean;
  departments: DepartmentOption[];
  staff: StaffOption[];
}) {
  const router = useRouter();
  const [action, setAction] = useState<AdminAction>(
    status === "resolved" ? "verify" : status === "submitted" ? "review" : "note",
  );
  const [selectedDepartment, setSelectedDepartment] = useState(departmentId ?? "");
  const [selectedStaff, setSelectedStaff] = useState(staffId ?? "");
  const [selectedPriority, setSelectedPriority] = useState(priority);
  const [selectedStatus, setSelectedStatus] = useState(status === "rejected" ? "under_review" : status);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const departmentStaff = useMemo(
    () => staff.filter((member) => !selectedDepartment || member.department_id === selectedDepartment),
    [staff, selectedDepartment],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (action === "delete_demo") {
      if (!window.confirm("Delete this demo record permanently? This cannot be undone.")) return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = { action };
      if (action === "assign") {
        payload.departmentId = selectedDepartment;
        payload.staffId = selectedStaff;
        if (note) payload.note = note;
      } else if (action === "priority") {
        payload.priority = selectedPriority;
      } else if (action === "status") {
        payload.status = selectedStatus;
        if (note) payload.note = note;
      } else if (action === "reject" || action === "reopen") {
        payload.reason = reason;
      } else if (note) {
        payload.note = note;
      }
      const response = await postJson<{ message?: string }>(
        `/api/admin/complaints/${complaintId}/action`,
        payload,
      );
      toast.success(response.message || "Report updated.");
      setNote("");
      setReason("");
      if (action === "delete_demo") {
        router.push("/admin/complaints");
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the report.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface overflow-hidden">
      <div className="border-b bg-emerald-500/[0.045] p-5">
        <h2 className="font-display text-base font-semibold">Administrator actions</h2>
        <p className="mt-1 text-xs leading-5 text-ink-500 dark:text-ink-300">
          Every action is written to the audit log and, where relevant, notifies the reporter and assigned team.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((item) => {
            const Icon = item.icon;
            const unavailable =
              (item.key === "verify" && status !== "resolved") ||
              (item.key === "close" && !["resolved", "verified"].includes(status)) ||
              (item.key === "restore" && status !== "archived") ||
              (item.key === "delete_demo" && !isDemo);
            return (
              <button
                key={item.key}
                type="button"
                disabled={unavailable}
                onClick={() => setAction(item.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                  action === item.key
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "text-ink-500 hover:border-emerald-500/30 hover:text-ink-800 dark:text-ink-300",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4 p-5">
        <p className="rounded-xl bg-ink-50 p-3 text-[11px] leading-5 text-ink-500 dark:bg-white/5 dark:text-ink-300">
          {actions.find((item) => item.key === action)?.description}
        </p>

        {action === "assign" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="admin-department">Department</Label>
              <Select
                id="admin-department"
                required
                value={selectedDepartment}
                onChange={(event) => {
                  setSelectedDepartment(event.target.value);
                  setSelectedStaff("");
                }}
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="admin-staff">Staff member (optional)</Label>
              <Select
                id="admin-staff"
                value={selectedStaff}
                onChange={(event) => setSelectedStaff(event.target.value)}
              >
                <option value="">Any staff in the department</option>
                {departmentStaff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </Select>
              <FieldHint>Assigning a named staff member sends them a notification.</FieldHint>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="assign-note">Assignment note (optional)</Label>
              <Input
                id="assign-note"
                value={note}
                maxLength={2000}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Any context the department should know."
              />
            </div>
          </div>
        ) : null}

        {action === "priority" ? (
          <div>
            <Label htmlFor="admin-priority">Priority</Label>
            <Select
              id="admin-priority"
              value={selectedPriority}
              onChange={(event) => setSelectedPriority(event.target.value)}
            >
              {PRIORITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} — {item.description}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {action === "status" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="admin-status">Status</Label>
              <Select
                id="admin-status"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
              <FieldHint>Setting verified through this control also awards points.</FieldHint>
            </div>
            <div>
              <Label htmlFor="status-note">Note (optional)</Label>
              <Input
                id="status-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Why is the status changing?"
              />
            </div>
          </div>
        ) : null}

        {action === "reject" || action === "reopen" ? (
          <div>
            <Label htmlFor="admin-reason">{action === "reject" ? "Rejection reason" : "Reopen reason"}</Label>
            <Textarea
              id="admin-reason"
              required
              minLength={10}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                action === "reject"
                  ? "Explain clearly why this report cannot be accepted. The reporter will see this."
                  : "Explain why the report is being reopened."
              }
            />
            <FieldHint>At least 10 characters. This is shared with the reporter.</FieldHint>
          </div>
        ) : null}

        {action === "note" || action === "review" || action === "verify" || action === "close" ? (
          <div>
            <Label htmlFor="admin-note">
              {action === "note" ? "Internal note" : action === "verify" ? "Verification note" : "Note (optional)"}
            </Label>
            <Textarea
              id="admin-note"
              required={action === "note"}
              minLength={action === "note" ? 2 : undefined}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                action === "note"
                  ? "Private note visible only to administrators."
                  : "Context for this action, shown in the timeline where applicable."
              }
            />
          </div>
        ) : null}

        {action === "delete_demo" ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-3 text-[11px] leading-5 text-rose-800 dark:text-rose-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            This demo record and its timeline, assignments and notifications will be deleted permanently. Only
            demo-labelled records can be deleted here.
          </div>
        ) : null}

        <div className="flex justify-end border-t pt-4">
          <Button
            type="submit"
            loading={saving}
            variant={action === "delete_demo" || action === "reject" ? "danger" : "primary"}
          >
            {action === "delete_demo" ? <Trash2 className="h-4 w-4" /> : <UserRoundSearch className="h-4 w-4" />}
            Confirm {actions.find((item) => item.key === action)?.label.toLowerCase()}
          </Button>
        </div>
      </form>
    </section>
  );
}
