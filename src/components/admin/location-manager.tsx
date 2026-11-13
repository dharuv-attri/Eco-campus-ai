"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  ShieldQuestion,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/misc";
import { deleteJson, postJson } from "@/lib/client-api";
import { LOCATION_CATEGORIES } from "@/lib/constants";
import type { CampusLocation } from "@/types";

const emptyForm = {
  id: "",
  name: "",
  category: LOCATION_CATEGORIES[0] as string,
  building: "",
  floor: "",
  description: "",
  lat: "",
  lng: "",
  verified: false,
};

export function LocationManager({ locations }: { locations: CampusLocation[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function edit(location?: CampusLocation) {
    setForm(
      location
        ? {
            id: location.id,
            name: location.name,
            category: location.category,
            building: location.building ?? "",
            floor: location.floor ?? "",
            description: location.description ?? "",
            lat: location.lat === null ? "" : String(location.lat),
            lng: location.lng === null ? "" : String(location.lng),
            verified: location.verified === 1,
          }
        : emptyForm,
    );
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if ((form.lat && !form.lng) || (!form.lat && form.lng)) {
      toast.error("Enter both latitude and longitude, or leave both empty.");
      return;
    }
    setSaving(true);
    try {
      await postJson("/api/admin/locations", {
        id: form.id || undefined,
        name: form.name,
        category: form.category,
        building: form.building,
        floor: form.floor,
        description: form.description,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        verified: form.verified,
      });
      toast.success(form.id ? "Location updated." : "Location created.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the location.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(location: CampusLocation) {
    if (!window.confirm(`Delete ${location.name}? Reports using this location will keep their other location details.`)) {
      return;
    }
    try {
      await deleteJson("/api/admin/locations", { id: location.id });
      toast.success("Location deleted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the location.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-500 dark:text-ink-300">
          Only verified locations with coordinates appear as pins on the public campus map.
        </p>
        <Button onClick={() => edit()}>
          <Plus className="h-4 w-4" /> Add location
        </Button>
      </div>

      {locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No campus locations yet"
          description="Add verified buildings and facilities so reports can be mapped precisely."
          action={
            <Button onClick={() => edit()}>
              <Plus className="h-4 w-4" /> Add location
            </Button>
          }
        />
      ) : (
        <div className="surface overflow-hidden">
          <ul className="divide-y">
            {locations.map((location) => (
              <li key={location.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{location.name}</p>
                    {location.verified ? (
                      <Badge tone="emerald">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge tone="amber">
                        <ShieldQuestion className="h-3 w-3" /> Unverified
                      </Badge>
                    )}
                    <Badge tone="slate">{location.category}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-500">
                    {[location.building, location.floor].filter(Boolean).join(" · ") || "No building details"}
                    {location.lat !== null && location.lng !== null
                      ? ` · ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                      : " · No pin coordinates"}
                  </p>
                  {location.description ? (
                    <p className="mt-1 line-clamp-1 text-[11px] text-ink-400">{location.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {location.lat !== null && location.lng !== null ? (
                    <a
                      href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold text-ink-500 hover:text-forest-800 dark:hover:text-emerald-300"
                    >
                      Map <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                  <span title={`QR slug: ${location.qr_slug}`} className="rounded-lg border p-1.5 text-ink-400">
                    <QrCode className="h-3.5 w-3.5" />
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => edit(location)} aria-label={`Edit ${location.name}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(location)} aria-label={`Delete ${location.name}`}>
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
        title={form.id ? "Edit campus location" : "Add campus location"}
        description="Verify coordinates before enabling a public map pin. Never guess a building's position."
        className="max-w-2xl"
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="location-name">Location name</Label>
              <Input
                id="location-name"
                required
                minLength={2}
                maxLength={120}
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="e.g. Central Library"
              />
            </div>
            <div>
              <Label htmlFor="location-category">Category</Label>
              <Select
                id="location-category"
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                {LOCATION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="location-building">Building</Label>
              <Input
                id="location-building"
                maxLength={120}
                value={form.building}
                onChange={(event) => setForm((prev) => ({ ...prev, building: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="location-floor">Floor</Label>
              <Input
                id="location-floor"
                maxLength={60}
                value={form.floor}
                onChange={(event) => setForm((prev) => ({ ...prev, floor: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="location-lat">Latitude</Label>
              <Input
                id="location-lat"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={form.lat}
                onChange={(event) => setForm((prev) => ({ ...prev, lat: event.target.value }))}
                placeholder="30.991586"
              />
            </div>
            <div>
              <Label htmlFor="location-lng">Longitude</Label>
              <Input
                id="location-lng"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={form.lng}
                onChange={(event) => setForm((prev) => ({ ...prev, lng: event.target.value }))}
                placeholder="76.477097"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="location-description">Description</Label>
            <Textarea
              id="location-description"
              maxLength={500}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Nearest landmark or access notes."
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(event) => setForm((prev) => ({ ...prev, verified: event.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span>
              <span className="block text-sm font-medium">Verified location</span>
              <span className="mt-0.5 block text-[11px] leading-5 text-ink-500">
                Only verify when the name and coordinates have been checked against an official campus source.
                Unverified locations remain hidden from the public map.
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {form.id ? "Save changes" : "Create location"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
