"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { MapIssue, MapLocation } from "@/components/maps/map-inner";

const MapInner = dynamic(() => import("@/components/maps/map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] items-center justify-center rounded-2xl border bg-emerald-500/[0.03]">
      <div className="text-center">
        <MapPin className="mx-auto h-6 w-6 animate-pulse text-emerald-600" />
        <p className="mt-2 text-xs text-ink-400">Loading campus map…</p>
      </div>
    </div>
  ),
});

export function CampusMap(props: {
  locations: MapLocation[];
  issues: MapIssue[];
  center: { lat: number; lng: number };
  zoom?: number;
  height?: number;
  showFilters?: boolean;
}) {
  return <MapInner {...props} />;
}

export type { MapIssue, MapLocation };
