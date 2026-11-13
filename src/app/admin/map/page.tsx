import type { Metadata } from "next";
import { CheckCircle2, Layers, MapPin, ShieldQuestion } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { CampusMap } from "@/components/maps/campus-map";
import { LocationManager } from "@/components/admin/location-manager";
import { Badge } from "@/components/ui/badge";
import { SITE } from "@/lib/constants";
import { listCampusLocations, listMapIssues } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Campus map" };

export default async function AdminMapPage() {
  await requireRole(["admin", "super_admin"], "/admin/map");
  const settings = getSettings();
  const locations = listCampusLocations(false);
  const issues = listMapIssues(300);
  const center = {
    lat: Number(settings.map_center_lat) || SITE.mapCenter.lat,
    lng: Number(settings.map_center_lng) || SITE.mapCenter.lng,
  };
  const pinned = locations.filter((location) => location.lat !== null && location.lng !== null);

  return (
    <>
      <PageHeader
        eyebrow="Locations"
        title="Campus map management"
        description="Maintain campus locations and coordinates. Only verified locations with pins are shown on the public map; unverified pins remain admin-only."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="emerald">
          <CheckCircle2 className="h-3 w-3" /> {locations.filter((location) => location.verified === 1).length} verified
        </Badge>
        <Badge tone="amber">
          <ShieldQuestion className="h-3 w-3" /> {locations.filter((location) => location.verified !== 1).length} unverified
        </Badge>
        <Badge tone="sky">
          <Layers className="h-3 w-3" /> {issues.length} mapped issues
        </Badge>
        <Badge tone="slate">
          <MapPin className="h-3 w-3" /> {locations.length - pinned.length} without coordinates
        </Badge>
      </div>

      <div className="mb-6">
        <CampusMap
          locations={pinned.map((location) => ({
            id: location.id,
            name: location.name,
            category: location.category,
            building: location.building,
            floor: location.floor,
            description: location.description,
            lat: location.lat ?? 0,
            lng: location.lng ?? 0,
            verified: location.verified,
          }))}
          issues={issues.map((issue) => ({
            id: issue.id,
            code: issue.complaint_code,
            title: issue.title,
            status: issue.status,
            priority: issue.priority,
            category: issue.category,
            lat: issue.lat ?? 0,
            lng: issue.lng ?? 0,
            location: issue.location_name || issue.building || issue.specific_location,
            isDemo: issue.is_demo === 1,
          }))}
          center={center}
          zoom={15}
          height={480}
        />
        <p className="mt-2 text-[10px] leading-4 text-ink-400">
          {settings.map_center_source} Grey location pins are unverified and hidden from the public map. Never guess
          building coordinates — verify against an official campus source.
        </p>
      </div>

      <LocationManager locations={locations} />
    </>
  );
}
