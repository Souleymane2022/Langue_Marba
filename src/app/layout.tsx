import type { Metadata, Viewport } from "next";
import { BottomNav, ServiceWorker, TopBar } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vun Marbana — apprendre la langue Marba", template: "%s · Vun Marbana" },
  description:
    "Dictionnaire Marba–Français, leçons, quiz, vocabulaire par secteur (santé, agriculture, éducation…) et assistant IA pour apprendre et utiliser la langue Marba du Tchad.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  applicationName: "Vun Marbana",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#17130f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <TopBar />
        <main>{children}</main>
        <BottomNav />
        <ServiceWorker />
      </body>
    </html>
  );
}
