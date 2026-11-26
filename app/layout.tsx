import type { Metadata } from "next";
import "../globals.css";

const siteUrl = "https://bossaat-ferhatcaga-04.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BOŞSAAT | Yakınındaki İndirimli Randevu Fırsatları",
    template: "%s | BOŞSAAT",
  },
  description:
    "Yakınındaki kuaför, berber ve güzellik salonlarının boş randevu saatlerini indirimli fiyatlarla keşfet. Fırsatı bul, rezervasyon talebini gönder.",
  applicationName: "BOŞSAAT",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    locale: "tr_TR",
    siteName: "BOŞSAAT",
    title: "BOŞSAAT | Yakınındaki İndirimli Randevu Fırsatları",
    description:
      "Yakınındaki kuaför, berber ve güzellik salonlarının boş randevu saatlerini indirimli fiyatlarla keşfet.",
  },
  twitter: {
    card: "summary",
    title: "BOŞSAAT | Yakınındaki İndirimli Randevu Fırsatları",
    description:
      "Yakınındaki kuaför, berber ve güzellik salonlarının boş randevu saatlerini indirimli fiyatlarla keşfet.",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "BOŞSAAT",
      url: siteUrl,
      email: "Ferhatcaga04@gmail.com",
      description:
        "Kuaför, berber ve güzellik salonlarının boş randevu saatlerini indirimli fırsatlarla buluşturan yerel randevu platformu.",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "BOŞSAAT",
      alternateName: "Boş Saat",
      url: siteUrl,
      inLanguage: "tr-TR",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
