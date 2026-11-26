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
  alternates: { canonical: "/" },
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
    locale: "tr_TR",
    url: siteUrl,
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
