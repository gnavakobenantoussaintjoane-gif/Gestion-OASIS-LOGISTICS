import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "OASIS — Transport & Logistics",
  description:
    "Pilotage des opérations de transport, voyages et finances à Abidjan.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
