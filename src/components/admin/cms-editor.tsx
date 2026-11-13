"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  ImageIcon,
  Loader2,
  Palette,
  Save,
  Settings2,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/form";
import { postJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";

interface SectionRow {
  key: string;
  label: string;
  enabled: number;
  sort_order: number;
}

type Tab = "content" | "brand" | "sections" | "system";

export function CmsEditor({
  initialSettings,
  initialSections,
}: {
  initialSettings: Record<string, string>;
  initialSections: SectionRow[];
}) {
  const router = useRouter();
  const heroRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const backgroundRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("content");
  const [settings, setSettings] = useState(initialSettings);
  const [sections, setSections] = useState(initialSections);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"hero" | "logo" | "background" | null>(null);

  function set(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function upload(file: File, target: "hero" | "logo" | "background") {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Images must be 5 MB or smaller.");
      return;
    }
    setUploading(target);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body });
      const data = (await response.json()) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Upload failed.");
      const key =
        target === "hero" ? "hero_image" : target === "logo" ? "logo_url" : "background_image";
      set(key, data.url);
      await postJson("/api/admin/settings", { settings: { [key]: data.url } });
      toast.success("Image uploaded and published.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Image uploaded but could not be published. Save settings to try again.",
      );
    } finally {
      setUploading(null);
    }
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await postJson("/api/admin/settings", { settings });
      toast.success("Website settings saved.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSections() {
    setSaving(true);
    try {
      await postJson("/api/admin/sections", {
        sections: sections.map((section) => ({
          key: section.key,
          enabled: section.enabled === 1,
          sortOrder: section.sort_order,
        })),
      });
      toast.success("Homepage sections updated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save sections.");
    } finally {
      setSaving(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next.map((section, idx) => ({ ...section, sort_order: idx + 1 })));
  }

  const tabs: Array<{ key: Tab; label: string; icon: typeof Settings2 }> = [
    { key: "content", label: "Homepage content", icon: Sparkles },
    { key: "brand", label: "Brand & images", icon: Palette },
    { key: "sections", label: "Sections", icon: Eye },
    { key: "system", label: "Contact & system", icon: Settings2 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                tab === item.key
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : "text-ink-500 hover:bg-ink-50 dark:hover:bg-white/5",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {item.label}
            </button>
          );
        })}
      </div>

      {tab === "sections" ? (
        <div className="surface p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold">Homepage sections</h2>
          <p className="mt-1 text-xs text-ink-500">
            Reorder or hide sections on the public homepage. Changes apply immediately after saving.
          </p>
          <ul className="mt-4 space-y-2">
            {sections.map((section, index) => (
              <li
                key={section.key}
                className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-100 text-[10px] font-bold text-ink-500 dark:bg-white/5">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{section.label}</p>
                  <p className="font-mono text-[10px] text-ink-400">{section.key}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button type="button" size="sm" variant="ghost" onClick={() => move(index, -1)} aria-label="Move up">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => move(index, 1)} aria-label="Move down">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={section.enabled === 1}
                    aria-label={`${section.enabled ? "Hide" : "Show"} ${section.label}`}
                    onClick={() =>
                      setSections((prev) =>
                        prev.map((item) =>
                          item.key === section.key ? { ...item, enabled: item.enabled === 1 ? 0 : 1 } : item,
                        ),
                      )
                    }
                    className={cn(
                      "relative ml-1 h-6 w-11 rounded-full border transition",
                      section.enabled === 1 ? "border-emerald-600 bg-emerald-500" : "border-ink-300 bg-ink-200 dark:bg-ink-700",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                        section.enabled === 1 ? "translate-x-[22px]" : "translate-x-0.5",
                      )}
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end border-t pt-4">
            <Button onClick={saveSections} loading={saving}>
              <Save className="h-4 w-4" /> Save section order
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={saveSettings} className="surface space-y-5 p-5 sm:p-6">
          {tab === "content" ? (
            <>
              <div>
                <Label htmlFor="cms-hero-badge">Hero badge</Label>
                <Input
                  id="cms-hero-badge"
                  maxLength={120}
                  value={settings.hero_badge ?? ""}
                  onChange={(event) => set("hero_badge", event.target.value)}
                />
                <FieldHint>Keep the independent-platform wording unless written authorization exists.</FieldHint>
              </div>
              <div>
                <Label htmlFor="cms-hero-heading">Hero heading</Label>
                <Textarea
                  id="cms-hero-heading"
                  maxLength={180}
                  value={settings.hero_heading ?? ""}
                  onChange={(event) => set("hero_heading", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cms-hero-description">Hero description</Label>
                <Textarea
                  id="cms-hero-description"
                  maxLength={600}
                  value={settings.hero_description ?? ""}
                  onChange={(event) => set("hero_description", event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cms-about-heading">About heading</Label>
                  <Input
                    id="cms-about-heading"
                    maxLength={180}
                    value={settings.about_heading ?? ""}
                    onChange={(event) => set("about_heading", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cms-tagline">Tagline</Label>
                  <Input
                    id="cms-tagline"
                    maxLength={180}
                    value={settings.tagline ?? ""}
                    onChange={(event) => set("tagline", event.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cms-about-summary">About summary</Label>
                <Textarea
                  id="cms-about-summary"
                  maxLength={1200}
                  value={settings.about_summary ?? ""}
                  onChange={(event) => set("about_summary", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cms-announcement-banner">Site-wide announcement banner</Label>
                <Textarea
                  id="cms-announcement-banner"
                  maxLength={300}
                  value={settings.announcement_banner ?? ""}
                  onChange={(event) => set("announcement_banner", event.target.value)}
                  placeholder="Leave empty to hide the banner."
                />
              </div>
            </>
          ) : null}

          {tab === "brand" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageField
                  label="Hero image"
                  value={settings.hero_image ?? ""}
                  onChange={(value) => set("hero_image", value)}
                  onPick={() => heroRef.current?.click()}
                  uploading={uploading === "hero"}
                />
                <ImageField
                  label="Logo image"
                  value={settings.logo_url ?? ""}
                  onChange={(value) => set("logo_url", value)}
                  onPick={() => logoRef.current?.click()}
                  uploading={uploading === "logo"}
                />
                <ImageField
                  label="Site background image"
                  value={settings.background_image ?? ""}
                  onChange={(value) => set("background_image", value)}
                  onPick={() => backgroundRef.current?.click()}
                  uploading={uploading === "background"}
                />
              </div>
              <input
                ref={heroRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file, "hero");
                }}
              />
              <input
                ref={logoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file, "logo");
                }}
              />
              <input
                ref={backgroundRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file, "background");
                }}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cms-primary">Primary colour</Label>
                  <div className="flex gap-2">
                    <input
                      id="cms-primary"
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(settings.primary_color) ? settings.primary_color : "#14532D"}
                      onChange={(event) => set("primary_color", event.target.value.toUpperCase())}
                      className="h-10 w-14 cursor-pointer rounded-lg border bg-transparent p-1"
                    />
                    <Input
                      value={settings.primary_color ?? ""}
                      onChange={(event) => set("primary_color", event.target.value)}
                      className="font-mono uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cms-secondary">Secondary colour</Label>
                  <div className="flex gap-2">
                    <input
                      id="cms-secondary"
                      type="color"
                      value={
                        /^#[0-9a-fA-F]{6}$/.test(settings.secondary_color) ? settings.secondary_color : "#10B981"
                      }
                      onChange={(event) => set("secondary_color", event.target.value.toUpperCase())}
                      className="h-10 w-14 cursor-pointer rounded-lg border bg-transparent p-1"
                    />
                    <Input
                      value={settings.secondary_color ?? ""}
                      onChange={(event) => set("secondary_color", event.target.value)}
                      className="font-mono uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  id="cms-background"
                  label="Light theme background"
                  value={settings.background_color ?? "#F6FAF7"}
                  fallback="#F6FAF7"
                  onChange={(value) => set("background_color", value)}
                />
                <ColorField
                  id="cms-dark-background"
                  label="Dark theme background"
                  value={settings.dark_background_color ?? "#0A1410"}
                  fallback="#0A1410"
                  onChange={(value) => set("dark_background_color", value)}
                />
              </div>
              <p className="rounded-xl bg-amber-500/[0.06] p-3 text-[11px] leading-5 text-amber-800 dark:text-amber-200">
                These colors apply to the live site after saving. Keep text readable against both backgrounds and
                ensure your brand colors provide sufficient contrast.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cms-water">Water saved (litres)</Label>
                  <Input
                    id="cms-water"
                    type="number"
                    min={0}
                    value={settings.water_saved_liters ?? ""}
                    onChange={(event) => set("water_saved_liters", event.target.value)}
                    placeholder="Leave empty if not tracked"
                  />
                </div>
                <div>
                  <Label htmlFor="cms-energy">Energy saved (kWh)</Label>
                  <Input
                    id="cms-energy"
                    type="number"
                    min={0}
                    value={settings.energy_saved_kwh ?? ""}
                    onChange={(event) => set("energy_saved_kwh", event.target.value)}
                    placeholder="Leave empty if not tracked"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cms-impact-note">Impact metric note</Label>
                <Input
                  id="cms-impact-note"
                  maxLength={300}
                  value={settings.impact_metric_note ?? ""}
                  onChange={(event) => set("impact_metric_note", event.target.value)}
                  placeholder="State how these figures were measured."
                />
              </div>
            </>
          ) : null}

          {tab === "system" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cms-contact-email">Contact email</Label>
                  <Input
                    id="cms-contact-email"
                    type="email"
                    value={settings.contact_email ?? ""}
                    onChange={(event) => set("contact_email", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cms-contact-phone">Contact phone</Label>
                  <Input
                    id="cms-contact-phone"
                    value={settings.contact_phone ?? ""}
                    onChange={(event) => set("contact_phone", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cms-contact-mobile">Contact mobile</Label>
                  <Input
                    id="cms-contact-mobile"
                    value={settings.contact_mobile ?? ""}
                    onChange={(event) => set("contact_mobile", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cms-university">University name</Label>
                  <Input
                    id="cms-university"
                    value={settings.university_name ?? ""}
                    onChange={(event) => set("university_name", event.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cms-address">Campus address</Label>
                <Textarea
                  id="cms-address"
                  value={settings.address ?? ""}
                  onChange={(event) => set("address", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cms-footer">Footer disclaimer</Label>
                <Textarea
                  id="cms-footer"
                  value={settings.footer_text ?? ""}
                  onChange={(event) => set("footer_text", event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cms-lat">Map centre latitude</Label>
                  <Input
                    id="cms-lat"
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={settings.map_center_lat ?? ""}
                    onChange={(event) => set("map_center_lat", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cms-lng">Map centre longitude</Label>
                  <Input
                    id="cms-lng"
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={settings.map_center_lng ?? ""}
                    onChange={(event) => set("map_center_lng", event.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cms-map-source">Map source note</Label>
                <Input
                  id="cms-map-source"
                  value={settings.map_center_source ?? ""}
                  onChange={(event) => set("map_center_source", event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="cms-instagram">Instagram URL</Label>
                  <Input
                    id="cms-instagram"
                    value={settings.social_instagram ?? ""}
                    onChange={(event) => set("social_instagram", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cms-linkedin">LinkedIn URL</Label>
                  <Input
                    id="cms-linkedin"
                    value={settings.social_linkedin ?? ""}
                    onChange={(event) => set("social_linkedin", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cms-youtube">YouTube URL</Label>
                  <Input
                    id="cms-youtube"
                    value={settings.social_youtube ?? ""}
                    onChange={(event) => set("social_youtube", event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cms-anonymous">Anonymous reporting</Label>
                  <Select
                    id="cms-anonymous"
                    value={settings.anonymous_reporting_enabled ?? "true"}
                    onChange={(event) => set("anonymous_reporting_enabled", event.target.value)}
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cms-registration">Public registration</Label>
                  <Select
                    id="cms-registration"
                    value={settings.registration_open ?? "true"}
                    onChange={(event) => set("registration_open", event.target.value)}
                  >
                    <option value="true">Open</option>
                    <option value="false">Closed</option>
                  </Select>
                  <FieldHint>Closing registration blocks new sign-ups; existing accounts remain active.</FieldHint>
                </div>
              </div>
            </>
          ) : null}

          <div className="flex justify-end border-t pt-4">
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" /> Save settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  fallback,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <input
          id={id}
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-10 w-14 cursor-pointer rounded-lg border bg-transparent p-1"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
  onPick,
  uploading,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPick: () => void;
  uploading: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex gap-2">
        <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="/uploads/… or https://…" />
        <Button type="button" variant="outline" onClick={onPick} disabled={uploading} className="shrink-0">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload
        </Button>
      </div>
      {value ? (
        <div className="mt-2 flex items-center gap-2 rounded-xl border p-2">
          <ImageIcon className="h-4 w-4 text-ink-400" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={`${label} preview`} className="h-12 w-24 rounded-lg object-cover" />
          <button type="button" onClick={() => onChange("")} className="ml-auto text-[11px] font-medium text-rose-600">
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
