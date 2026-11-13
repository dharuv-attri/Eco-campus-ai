"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Crosshair,
  ImagePlus,
  Loader2,
  MapPin,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint, Switch } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { PriorityBadge, DemoBadge } from "@/components/ui/badge";
import { PROBLEM_CATEGORIES, PRIORITIES } from "@/lib/constants";
import { postJson } from "@/lib/client-api";
import { timeAgo } from "@/lib/utils";
import type { CampusLocation, SessionUser } from "@/types";

interface DuplicateCandidate {
  id: string;
  complaint_code: string;
  title: string;
  status: string;
  created_at: string;
}

type UploadedImage = { url: string; name: string };

export function ReportForm({
  user,
  locations,
  anonymousEnabled,
  detailBase = "/student/reports",
}: {
  user: SessionUser;
  locations: CampusLocation[];
  anonymousEnabled: boolean;
  detailBase?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [success, setSuccess] = useState<{ code: string; id: string; demo?: boolean } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    priority: "medium",
    locationId: "",
    building: "",
    floor: "",
    roomNumber: "",
    specificLocation: "",
    lat: null as number | null,
    lng: null as number | null,
    anonymous: false,
    terms: false,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onLocationChange(id: string) {
    const location = locations.find((item) => item.id === id);
    setForm((prev) => ({
      ...prev,
      locationId: id,
      building: location?.building || prev.building,
      floor: location?.floor || prev.floor,
    }));
  }

  async function uploadFiles(files: FileList | File[]) {
    const remaining = 5 - images.length;
    if (remaining <= 0) {
      toast.error("You can attach up to 5 photos.");
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    setUploading(true);
    const uploaded: UploadedImage[] = [];
    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5 MB.`);
        continue;
      }
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/uploads", { method: "POST", body });
        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error || "Upload failed.");
        uploaded.push({ url: data.url, name: file.name });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `${file.name} could not be uploaded.`);
      }
    }
    setImages((prev) => [...prev, ...uploaded].slice(0, 5));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function locate() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser.");
      setGeoState("error");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update("lat", Number(position.coords.latitude.toFixed(7)));
        update("lng", Number(position.coords.longitude.toFixed(7)));
        setGeoState("done");
        toast.success("Location captured. Add building and room for clarity.");
      },
      () => {
        setGeoState("error");
        toast.error("Could not access your location. You can still describe the place manually.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function payload(confirmedDuplicate = false) {
    return {
      title: form.title,
      category: form.category,
      description: form.description,
      priority: form.priority,
      locationId: form.locationId,
      building: form.building,
      floor: form.floor,
      roomNumber: form.roomNumber,
      specificLocation: form.specificLocation,
      lat: form.lat,
      lng: form.lng,
      anonymous: form.anonymous,
      imageUrls: images.map((image) => image.url),
      confirmedDuplicate,
    };
  }

  async function submit(event: React.FormEvent, confirmedDuplicate = false) {
    event.preventDefault();
    if (!form.terms) {
      toast.error("Please confirm that this is a genuine environmental report.");
      return;
    }
    setLoading(true);
    try {
      if (!confirmedDuplicate) {
        const check = await postJson<{ duplicates?: DuplicateCandidate[] }>("/api/reports/check-duplicate", {
          category: form.category,
          locationId: form.locationId,
          building: form.building,
          title: form.title,
        });
        if (check.duplicates?.length) {
          setDuplicates(check.duplicates);
          setShowDuplicateModal(true);
          setLoading(false);
          return;
        }
      }
      const result = await postJson<{ complaint?: { id: string; complaint_code: string; is_demo?: number } }>(
        "/api/reports",
        payload(confirmedDuplicate),
      );
      if (!result.complaint) throw new Error("The report could not be created.");
      setSuccess({
        id: result.complaint.id,
        code: result.complaint.complaint_code,
        demo: result.complaint.is_demo === 1,
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit your report.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="surface mx-auto max-w-2xl p-6 text-center sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold">Report submitted successfully</h2>
        <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">
          Your report has been received. Save the tracking code below; you can follow every status change in your dashboard.
        </p>
        <div className="mx-auto mt-5 w-fit rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Tracking code
          </p>
          <p className="mt-1 font-mono text-xl font-bold tracking-wider">{success.code}</p>
          {success.demo ? <DemoBadge className="mt-2" /> : null}
        </div>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href={`${detailBase}/${success.id}`}>
            <Button className="w-full sm:w-auto">
              <MapPin className="h-4 w-4" /> Open report timeline
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setSuccess(null);
              setImages([]);
              setForm({
                title: "",
                category: "",
                description: "",
                priority: "medium",
                locationId: "",
                building: "",
                floor: "",
                roomNumber: "",
                specificLocation: "",
                lat: null,
                lng: null,
                anonymous: false,
                terms: false,
              });
            }}
          >
            Submit another report
          </Button>
        </div>
        <p className="mt-5 text-[11px] text-ink-400">
          For electrical hazards, fire or medical emergencies, contact campus staff directly. EcoCampus AI is not an emergency service.
        </p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={(event) => submit(event)} className="grid gap-6 lg:grid-cols-[1fr_330px]">
        <div className="space-y-6">
          <section className="surface p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                1
              </span>
              <div>
                <h2 className="font-display text-base font-semibold">What is the problem?</h2>
                <p className="text-xs text-ink-500">Choose the closest category and describe it clearly.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="report-title">Short title *</Label>
                <Input
                  id="report-title"
                  required
                  minLength={8}
                  maxLength={160}
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="e.g. Tap leaking continuously outside the library washroom"
                />
                <FieldHint>A specific title helps the maintenance team respond faster.</FieldHint>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="report-category">Category *</Label>
                  <Select
                    id="report-category"
                    required
                    value={form.category}
                    onChange={(event) => update("category", event.target.value)}
                  >
                    <option value="">Select a category</option>
                    {PROBLEM_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="report-priority">Priority</Label>
                  <Select
                    id="report-priority"
                    value={form.priority}
                    onChange={(event) => update("priority", event.target.value)}
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="report-description">Detailed description *</Label>
                <Textarea
                  id="report-description"
                  required
                  minLength={20}
                  maxLength={3000}
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                  placeholder="What did you see? When did it start? Is anyone at risk? Include details that help staff find the exact spot."
                  className="min-h-32"
                />
                <FieldHint>{form.description.length}/3000 characters</FieldHint>
              </div>
              {form.priority === "emergency" ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-3 text-xs leading-5 text-rose-700 dark:text-rose-300">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Emergency priority is for hazards such as exposed wiring, sewage overflow or fire risk. Stay away from the
                    area and inform campus staff immediately. Do not attempt repairs yourself.
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="surface p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                2
              </span>
              <div>
                <h2 className="font-display text-base font-semibold">Where is it?</h2>
                <p className="text-xs text-ink-500">Add a building, floor and landmark so the team can find it.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="report-location">Campus location</Label>
                <Select
                  id="report-location"
                  value={form.locationId}
                  onChange={(event) => onLocationChange(event.target.value)}
                >
                  <option value="">Select a campus area (optional)</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                      {location.verified ? " ✓" : " (pin pending)"}
                    </option>
                  ))}
                </Select>
                <FieldHint>Only verified locations appear on the public map as building pins.</FieldHint>
              </div>
              <div>
                <Label htmlFor="report-building">Building / block</Label>
                <Input
                  id="report-building"
                  value={form.building}
                  onChange={(event) => update("building", event.target.value)}
                  placeholder="e.g. Academic Block A"
                />
              </div>
              <div>
                <Label htmlFor="report-floor">Floor</Label>
                <Input
                  id="report-floor"
                  value={form.floor}
                  onChange={(event) => update("floor", event.target.value)}
                  placeholder="e.g. Ground floor"
                />
              </div>
              <div>
                <Label htmlFor="report-room">Room / area</Label>
                <Input
                  id="report-room"
                  value={form.roomNumber}
                  onChange={(event) => update("roomNumber", event.target.value)}
                  placeholder="e.g. Room 104 / near stairs"
                />
              </div>
              <div>
                <Label htmlFor="report-specific">Nearest landmark</Label>
                <Input
                  id="report-specific"
                  value={form.specificLocation}
                  onChange={(event) => update("specificLocation", event.target.value)}
                  placeholder="e.g. beside the water cooler"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={locate} loading={geoState === "loading"}>
                    <Crosshair className="h-4 w-4" /> Use my current location
                  </Button>
                  {geoState === "done" && form.lat !== null ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> {form.lat.toFixed(5)}, {form.lng?.toFixed(5)}
                    </span>
                  ) : null}
                  {geoState === "error" ? (
                    <span className="text-[11px] text-rose-600">Location unavailable — describe the place manually.</span>
                  ) : null}
                </div>
                <FieldHint>
                  GPS is optional. Use it only when you are physically on site. Never put yourself at risk.
                </FieldHint>
              </div>
            </div>
          </section>

          <section className="surface p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                3
              </span>
              <div>
                <h2 className="font-display text-base font-semibold">Add photos (optional)</h2>
                <p className="text-xs text-ink-500">Up to 5 images, 5 MB each. Photos speed up verification.</p>
              </div>
            </div>
            <div
              className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.03]"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (event.dataTransfer.files.length) void uploadFiles(event.dataTransfer.files);
              }}
            >
              <ImagePlus className="h-7 w-7 text-emerald-600" />
              <p className="mt-2 text-sm font-medium">Drag photos here or choose files</p>
              <p className="mt-1 text-[11px] text-ink-400">JPEG, PNG or WebP. Do not photograph people or unsafe areas.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="h-4 w-4" /> Choose photos
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) void uploadFiles(event.target.files);
                }}
              />
            </div>
            {images.length ? (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {images.map((image) => (
                  <div key={image.url} className="group relative aspect-square overflow-hidden rounded-xl border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((item) => item.url !== image.url))}
                      className="absolute right-1 top-1 rounded-md bg-ink-950/70 p-1 text-white opacity-90 transition hover:bg-rose-600"
                      aria-label={`Remove ${image.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {uploading ? (
                  <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="surface space-y-4 p-5 sm:p-6">
            <Switch
              checked={anonymousEnabled && form.anonymous}
              onChange={(value) => {
                if (!anonymousEnabled) return;
                update("anonymous", value);
              }}
              label="Hide my name on this report"
              description={
                anonymousEnabled
                  ? "Administrators and assigned staff still see your account so they can contact you if needed. Your name is hidden from other students."
                  : "Anonymous reporting has been disabled by the platform administrator."
              }
            />
            {!anonymousEnabled ? (
              <p className="rounded-lg bg-ink-50 px-3 py-2 text-[11px] text-ink-500 dark:bg-white/5">
                Anonymous reporting is currently disabled. Contact an administrator if you need to report privately.
              </p>
            ) : null}
            <label className="flex items-start gap-2.5 text-[11px] leading-5 text-ink-500">
              <input
                type="checkbox"
                required
                checked={form.terms}
                onChange={(event) => update("terms", event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 accent-emerald-600"
              />
              <span>
                I confirm this is a genuine environmental problem on campus. I understand EcoCampus AI is an independent
                project and not an emergency service.
              </span>
            </label>
            <div className="flex justify-end border-t pt-4">
              <Button type="submit" size="lg" loading={loading} disabled={uploading}>
                <Send className="h-4 w-4" /> Submit report
              </Button>
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <div className="surface p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold">Good report checklist</p>
            </div>
            <ul className="mt-3 space-y-2.5 text-xs leading-5 text-ink-500 dark:text-ink-300">
              {[
                "One problem per report — avoid combining several issues.",
                "Use the exact building, floor and nearest landmark.",
                "A clear photo from a safe position helps verification.",
                "Describe what you observed, not who may be responsible.",
                "Check the tracking timeline for staff updates.",
              ].map((tip) => (
                <li key={tip} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <TriangleAlert className="h-3.5 w-3.5" /> Safety first
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-amber-800/80 dark:text-amber-200/80">
              Do not touch exposed wiring, open sewage covers, climb roofs or enter restricted areas. For fire, injury or
              immediate danger, contact campus security or emergency services first.
            </p>
          </div>

          <div className="surface p-5">
            <p className="text-xs font-semibold">Reporting as</p>
            <p className="mt-1 text-sm font-medium">{form.anonymous ? "Anonymous reporter" : user.fullName}</p>
            <p className="text-[11px] text-ink-500">{user.email}</p>
            <p className="mt-2 text-[10px] leading-4 text-ink-400">
              Your account is securely linked for status notifications. Anonymous reports hide your name from public views.
            </p>
          </div>

          <div className="surface p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Current selection
            </p>
            <p className="mt-1.5 text-xs text-ink-500">
              {[form.building, form.floor, form.roomNumber, form.specificLocation].filter(Boolean).join(" · ") ||
                "No location details added yet."}
            </p>
            {form.category ? (
              <div className="mt-2 flex items-center gap-2">
                <PriorityBadge priority={form.priority} />
                <span className="text-[10px] text-ink-400">
                  {PROBLEM_CATEGORIES.find((item) => item.value === form.category)?.label}
                </span>
              </div>
            ) : null}
          </div>
        </aside>
      </form>

      <Modal
        open={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Similar recent report found"
        description="You may already have reported this issue. Continuing creates a separate report."
        className="max-w-xl"
      >
        <div className="space-y-3">
          {duplicates.map((duplicate) => (
            <div key={duplicate.id} className="rounded-xl border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] text-ink-400">{duplicate.complaint_code}</p>
                  <p className="mt-0.5 text-sm font-semibold">{duplicate.title}</p>
                </div>
                <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-ink-600 dark:bg-white/10 dark:text-ink-300">
                  {duplicate.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-ink-400">Submitted {timeAgo(duplicate.created_at)}</p>
              <Link
                href={`${detailBase}/${duplicate.id}`}
                className="mt-1 inline-block text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
              >
                Open existing report →
              </Link>
            </div>
          ))}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-[11px] leading-5 text-emerald-800 dark:text-emerald-300">
            <CircleAlert className="mr-1 inline h-3.5 w-3.5" />
            If the earlier report is a different problem or the issue has returned, you can submit a new report. Duplicate
            reports are reviewed but may be merged.
          </div>
          <div className="flex flex-col-reverse justify-end gap-2 border-t pt-4 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setShowDuplicateModal(false)}>
              Go back to edit
            </Button>
            <Button
              type="button"
              onClick={(event) => {
                setShowDuplicateModal(false);
                void submit(event, true);
              }}
              loading={loading}
            >
              Submit a separate report
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
