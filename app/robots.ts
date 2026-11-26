import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/panel/", "/admin/", "/api/"],
    },
    sitemap: "https://bossaat-ferhatcaga-04.vercel.app/sitemap.xml",
    host: "https://bossaat-ferhatcaga-04.vercel.app",
  };
}
