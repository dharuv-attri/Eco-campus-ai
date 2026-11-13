import "server-only";
import { all, one } from "@/lib/db";
import type { CampusLocation } from "@/types";

export interface Announcement {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string;
  published: number;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string;
  read_minutes: number;
  image_url: string | null;
  published: number;
  created_at: string;
  updated_at: string;
}

export function listPublishedAnnouncements(limit = 30) {
  return all<Announcement>(
    "SELECT * FROM announcements WHERE published = 1 ORDER BY created_at DESC LIMIT ?",
    limit,
  );
}

export function getAnnouncementBySlug(slug: string) {
  return one<Announcement>("SELECT * FROM announcements WHERE slug = ? AND published = 1", slug);
}

export function listPublishedArticles(limit = 30) {
  return all<Article>(
    "SELECT * FROM environmental_articles WHERE published = 1 ORDER BY created_at DESC LIMIT ?",
    limit,
  );
}

export function getArticleBySlug(slug: string) {
  return one<Article>("SELECT * FROM environmental_articles WHERE slug = ? AND published = 1", slug);
}

export function listCampusLocations(onlyWithPins = false) {
  const where = onlyWithPins ? "WHERE lat IS NOT NULL AND lng IS NOT NULL" : "";
  return all<CampusLocation>(
    `SELECT * FROM campus_locations ${where} ORDER BY verified DESC, name ASC`,
  ).map((location) => ({
    id: location.id,
    name: location.name,
    category: location.category,
    building: location.building,
    floor: location.floor,
    description: location.description,
    lat: location.lat,
    lng: location.lng,
    verified: location.verified,
    qr_slug: location.qr_slug,
    created_at: location.created_at,
  }));
}

export function getVerifiedLocationsWithPins() {
  return all<CampusLocation>(
    "SELECT * FROM campus_locations WHERE lat IS NOT NULL AND lng IS NOT NULL AND verified = 1 ORDER BY name ASC",
  );
}

export function listMapIssues(limit = 200) {
  return all<{
    id: string;
    complaint_code: string;
    title: string;
    category: string;
    status: string;
    priority: string;
    lat: number | null;
    lng: number | null;
    building: string | null;
    specific_location: string | null;
    is_demo: number;
    location_name: string | null;
  }>(
    `SELECT c.id, c.complaint_code, c.title, c.category, c.status, c.priority, c.lat, c.lng,
       c.building, c.specific_location, c.is_demo, l.name AS location_name
     FROM complaints c LEFT JOIN campus_locations l ON l.id = c.location_id
     WHERE c.status NOT IN ('rejected', 'archived') AND c.lat IS NOT NULL AND c.lng IS NOT NULL
     ORDER BY c.created_at DESC LIMIT ?`,
    limit,
  );
}

export function countPublishedArticles() {
  return one<{ count: number }>(
    "SELECT COUNT(*) AS count FROM environmental_articles WHERE published = 1",
  )?.count ?? 0;
}
