"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      {shouldLoad ? (
        <MapInner {...props} />
      ) : (
        <div
          className="flex items-center justify-center rounded-2xl border bg-emerald-500/[0.03]"
          style={{ height: props.height ?? 460 }}
          role="status"
          aria-label="Campus map loads when it is near the screen"
        >
          <div className="text-center">
            <MapPin className="mx-auto h-6 w-6 animate-pulse text-emerald-600" aria-hidden />
            <p className="mt-2 text-xs text-ink-400">Loading campus map…</p>
          </div>
        </div>
      )}
    </div>
  );
}

export type { MapIssue, MapLocation };
