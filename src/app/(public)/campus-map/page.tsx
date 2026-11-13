import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers, MapPin, TriangleAlert } from "lucide-react";
import { CampusMap } from "@/components/maps/campus-map";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/misc";
import { listCampusLocations, listMapIssues } from "@/lib/content";
import { SITE } from "@/lib/constants";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Campus map",
  description:
    "Explore verified campus locations and public environmental issue markers at Lamrin Tech Skills University Punjab.",
};

export default function CampusMapPage() {
  const settings = getSettings();
  const locations = listCampusLocations(false);
  const issues = listMapIssues(300);
  const center = {
    lat: Number(settings.map_center_lat) || SITE.mapCenter.lat,
    lng: Number(settings.map_center_lng) || SITE.mapCenter.lng,
  };
  const pinned = locations.filter((location) => location.lat !== null && location.lng !== null);
  const unpinned = locations.filter((location) => location.lat === null || location.lng === null);

  return (
    <>
      <section className="border-b py-12 sm:py-16">
        <div className="container-eco">
          <SectionHeading
            eyebrow="Interactive map"
            title="Explore the campus map"
            description="Verified locations and reported issue markers. Building pins are added and verified by administrators."
            action={
              <Link href="/report-problem" className={buttonVariants.primary + " h-10 px-4 text-xs"}>
                Report a problem <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
            <Badge tone="emerald">
              <CheckCircle2 className="h-3 w-3" /> {pinned.filter((l) => l.verified).length} verified pins
            </Badge>
            <Badge tone="sky">
              <Layers className="h-3 w-3" /> {issues.length} public issue markers
            </Badge>
            <Badge tone="slate">
              <MapPin className="h-3 w-3" /> {unpinned.length} locations awaiting pins
            </Badge>
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-12">
        <div className="container-eco grid gap-6 lg:grid-cols-[1fr_330px]">
          <div>
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
              height={560}
            />
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 text-[11px] leading-5 text-amber-800 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {settings.map_center_source ||
                  "Map centre from the official LTSU Google Maps embed. Building-level pins require administrator verification."}{" "}
                Issue markers may use the campus centre until a precise location is confirmed, so treat them as
                indicative rather than exact.
              </p>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="surface p-5">
              <h2 className="font-display text-base font-semibold">Campus locations</h2>
              <p className="mt-1 text-xs text-ink-500">
                Use these names when reporting so maintenance teams can find the place quickly.
              </p>
              <ul className="mt-4 space-y-3">
                {locations.map((location) => (
                  <li key={location.id} className="flex items-start gap-2.5">
                    <span
                      className={
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg " +
                        (location.verified
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-ink-100 text-ink-400 dark:bg-white/5")
                      }
                    >
                      <MapPin className="h-3 w-3" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-5">{location.name}</p>
                      <p className="text-[10px] text-ink-400">
                        {location.building ? `${location.building} · ` : ""}
                        {location.verified ? "verified pin" : "pin pending verification"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="surface p-5">
              <h2 className="font-display text-base font-semibold">Map layers</h2>
              <ul className="mt-3 space-y-2 text-xs text-ink-500 dark:text-ink-300">
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#14532d]" /> Verified campus location
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> New report
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Under review
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Resolved / verified
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Rejected
                </li>
              </ul>
              <p className="mt-3 border-t pt-3 text-[10px] leading-4 text-ink-400">
                Markers display the public status of each report. Reporter identities are never shown.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Nothing at your location?
              </p>
              <p className="mt-1 text-[11px] leading-5 text-emerald-800/70 dark:text-emerald-200/70">
                You can still report it. Choose the closest campus area and describe the building, floor and
                nearest landmark in the report form.
              </p>
              <Link href="/report-problem" className={buttonVariants.primary + " mt-3 h-9 px-4 text-xs"}>
                Submit a report
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
