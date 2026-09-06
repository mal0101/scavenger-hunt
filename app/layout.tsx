import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { AmbientBackdrop } from "@/components/steampunk/ambient-backdrop";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gadz'arts Compass — Scavenger Hunt",
  description:
    "Gamified QR Code Treasure Hunt Platform — ENSAM Casablanca Kick-Off Week",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gadz'arts Compass",
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#d97707",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
        <body className="bg-surface text-on-surface font-body antialiased min-h-dvh">
          <AmbientBackdrop />
          <Providers>{children}</Providers>
        </body>
    </html>
  );
}
