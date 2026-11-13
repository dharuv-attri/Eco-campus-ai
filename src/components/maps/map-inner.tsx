"use client";

import { useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { CheckCircle2, Filter, MapPin } from "lucide-react";
import { categoryLabel, statusMeta } from "@/lib/utils";

export interface MapLocation {
  id: string;
  name: string;
  category: string;
  building?: string | null;
  floor?: string | null;
  description?: string | null;
  lat: number;
  lng: number;
  verified: number;
}

export interface MapIssue {
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  lat: number;
  lng: number;
  location?: string | null;
  isDemo?: boolean;
}

const statusColors: Record<string, string> = {
  submitted: "#0ea5e9",
  under_review: "#f59e0b",
  assigned: "#8b5cf6",
  in_progress: "#3b82f6",
  resolved: "#10b981",
  verified: "#059669",
  closed: "#64748b",
  rejected: "#f43f5e",
  reopened: "#f97316",
};

function pin(color: string, letter: string) {
  return L.divIcon({
    className: "",
    html: `<div class="map-pin" style="background:${color}"><span>${letter}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

export default function MapInner({
  locations,
  issues,
  center,
  zoom = 15,
  height = 460,
  showFilters = true,
}: {
  locations: MapLocation[];
  issues: MapIssue[];
  center: { lat: number; lng: number };
  zoom?: number;
  height?: number;
  showFilters?: boolean;
}) {
  const [showLocations, setShowLocations] = useState(true);
  const [showIssues, setShowIssues] = useState(true);
  const [category, setCategory] = useState("");

  const visibleIssues = useMemo(
    () => issues.filter((issue) => (category ? issue.category === category : true)),
    [issues, category],
  );

  const issueCategories = useMemo(
    () => Array.from(new Set(issues.map((issue) => issue.category))),
    [issues],
  );

  return (
    <div className="relative isolate overflow-hidden rounded-2xl border" style={{ height }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showLocations
          ? locations.map((location) =>
              location.lat && location.lng ? (
                <Marker
                  key={location.id}
                  position={[location.lat, location.lng]}
                  icon={pin(location.verified ? "#14532d" : "#94a3b8", "L")}
                >
                  <Popup>
                    <div className="min-w-[190px]">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                        {location.category}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink-900">{location.name}</p>
                      {location.building ? (
                        <p className="mt-1 text-xs text-ink-600">
                          {location.building}
                          {location.floor ? ` · ${location.floor}` : ""}
                        </p>
                      ) : null}
                      {location.description ? (
                        <p className="mt-1 text-[11px] leading-4 text-ink-500">{location.description}</p>
                      ) : null}
                      <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold">
                        {location.verified ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified location
                          </>
                        ) : (
                          <span className="text-ink-400">Pin awaiting verification</span>
                        )}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ) : null,
            )
          : null}

        {showIssues
          ? visibleIssues.map((issue) => (
              <Marker
                key={issue.id}
                position={[issue.lat, issue.lng]}
                icon={pin(statusColors[issue.status] ?? "#64748b", "!")}
              >
                <Popup>
                  <div className="min-w-[210px]">
                    <p className="font-mono text-[10px] text-ink-400">{issue.code}</p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-900">{issue.title}</p>
                    <p className="mt-1 text-xs text-ink-600">{categoryLabel(issue.category)}</p>
                    {issue.location ? (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-500">
                        <MapPin className="h-3 w-3" /> {issue.location}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                        style={{ background: statusColors[issue.status] ?? "#64748b" }}
                      >
                        {statusMeta(issue.status).label}
                      </span>
                      <span className="text-[10px] capitalize text-ink-500">{issue.priority} priority</span>
                    </div>
                    {issue.isDemo ? <p className="mt-1.5 text-[9px] font-bold uppercase text-amber-600">Demo record</p> : null}
                  </div>
                </Popup>
              </Marker>
            ))
          : null}
      </MapContainer>

      {showFilters ? (
        <div className="absolute right-3 top-3 z-[400] w-[210px] rounded-xl border bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:bg-[#101f19]/95">
          <p className="flex items-center gap-1.5 font-semibold">
            <Filter className="h-3.5 w-3.5 text-emerald-600" /> Map layers
          </p>
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={showIssues}
              onChange={(event) => setShowIssues(event.target.checked)}
              className="h-3.5 w-3.5 accent-emerald-600"
            />
            Reported issues ({visibleIssues.length})
          </label>
          <label className="mt-1.5 flex items-center gap-2">
            <input
              type="checkbox"
              checked={showLocations}
              onChange={(event) => setShowLocations(event.target.checked)}
              className="h-3.5 w-3.5 accent-emerald-600"
            />
            Campus locations ({locations.length})
          </label>
          {issueCategories.length ? (
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-lg border bg-white px-2 py-1.5 text-[11px] dark:bg-[#0d1a14]"
              aria-label="Filter map issues by category"
            >
              <option value="">All issue categories</option>
              {issueCategories.map((value) => (
                <option key={value} value={value}>
                  {categoryLabel(value)}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 z-[400] rounded-lg border bg-white/90 px-2.5 py-1.5 text-[9px] font-medium leading-4 text-ink-500 shadow backdrop-blur dark:bg-[#101f19]/90">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#14532d]" /> verified location
        <span className="ml-2 mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" /> resolved
        <span className="ml-2 mr-1 inline-block h-2 w-2 rounded-full bg-sky-500" /> new
      </div>
    </div>
  );
}
