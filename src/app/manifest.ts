import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EcoCampus AI — Smart Environmental Management System",
    short_name: "EcoCampus AI",
    description:
      "Report, track and resolve environmental problems at Lamrin Tech Skills University Punjab.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6faf7",
    theme_color: "#14532D",
    orientation: "portrait-primary",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
