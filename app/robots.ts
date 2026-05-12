import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/scan/", "/report/"] },
    ],
    sitemap: "https://deployready.in/sitemap.xml",
    host: "https://deployready.in",
  };
}
