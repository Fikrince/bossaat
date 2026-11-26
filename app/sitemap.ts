import type { MetadataRoute } from "next";

const baseUrl = "https://bossaat-ferhatcaga-04.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = [
    { path: "", priority: 1, changeFrequency: "daily" as const },
    { path: "/giris", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/isletme-kayit", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/kvkk-aydinlatma", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/gizlilik", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/kullanim-kosullari", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  return publicRoutes.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
