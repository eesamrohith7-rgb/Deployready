import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://deployready.in";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/webaudit`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/dashboard`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/monitor`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/auth`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
