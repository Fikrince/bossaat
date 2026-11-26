import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOŞSAAT — Boş kalan saatler, senin fırsatın",
  description: "Yakınındaki işletmelerin boş saatlerini fırsata dönüştür.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
