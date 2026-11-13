"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareHeart, RotateCcw, Star, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { postJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export function ReporterActions({
  complaintId,
  status,
  hasFeedback,
  canReopen,
}: {
  complaintId: string;
  status: string;
  hasFeedback: boolean;
  canReopen: boolean;
}) {
  const router = useRouter();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const canGiveFeedback =
    !hasFeedback && ["resolved", "verified", "closed"].includes(status);

  async function submitFeedback(event: React.FormEvent) {
    event.preventDefault();
    if (rating < 1) {
      toast.error("Choose a rating from 1 to 5 stars.");
      return;
    }
    setSaving(true);
    try {
      await postJson(`/api/complaints/${complaintId}/feedback`, { rating, comment });
      toast.success("Thank you for your feedback.");
      setFeedbackOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit feedback.");
    } finally {
      setSaving(false);
    }
  }

  async function submitReopen(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await postJson(`/api/complaints/${complaintId}/reopen`, { reason });
      toast.success("Report reopened. The campus team has been notified.");
      setReopenOpen(false);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reopen the report.");
    } finally {
      setSaving(false);
    }
  }

  if (!canGiveFeedback && !canReopen) return null;

  return (
    <>
      <section className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Your report, your voice</h2>
          <p className="mt-1 text-xs leading-5 text-ink-500 dark:text-ink-300">
            {canGiveFeedback
              ? "Rate how the issue was handled, or reopen it if the problem is still present."
              : "If the issue has returned, you can reopen this report for another review."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canGiveFeedback ? (
            <Button variant="secondary" size="sm" onClick={() => setFeedbackOpen(true)}>
              <Star className="h-4 w-4" /> Leave feedback
            </Button>
          ) : null}
          {canReopen ? (
            <Button variant="outline" size="sm" onClick={() => setReopenOpen(true)}>
              <RotateCcw className="h-4 w-4" /> Reopen report
            </Button>
          ) : null}
        </div>
      </section>

      <Modal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title="How was the resolution?"
        description="Your feedback helps the campus team improve. It is shared with the assigned staff member."
      >
        <form onSubmit={submitFeedback} className="space-y-4">
          <div>
            <Label>Rating</Label>
            <div className="mt-2 flex items-center gap-1.5" role="radiogroup" aria-label="Resolution rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  onClick={() => setRating(value)}
                  className="rounded-lg p-1 transition hover:bg-amber-500/10"
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition",
                      value <= rating ? "fill-amber-400 text-amber-400" : "text-ink-300",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="feedback-comment">Comment (optional)</Label>
            <Textarea
              id="feedback-comment"
              value={comment}
              maxLength={1000}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Was the work completed properly? Anything the team should know?"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <MessageSquareHeart className="h-4 w-4" /> Submit feedback
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        title="Reopen this report"
        description="Explain what is still wrong so the team can act on the right problem."
      >
        <form onSubmit={submitReopen} className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-[11px] leading-5 text-amber-800 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Reopening notifies administrators and the assigned department. Use it only when the issue genuinely
            persists.
          </div>
          <div>
            <Label htmlFor="reopen-reason">What is still unresolved?</Label>
            <Textarea
              id="reopen-reason"
              required
              minLength={10}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Example: The tap is still leaking after the repair visit."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setReopenOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={saving}>
              <RotateCcw className="h-4 w-4" /> Reopen report
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
