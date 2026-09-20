import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { Toaster } from "sonner";

const FAVICON_BASE64 = "PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJ6LWdsb3ciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMDBFNUZGIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNCMjAwRkYiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0ibmVvbi1ibHVyIiB4PSItMjAlIiB5PSItMjAlIiB3aWR0aD0iMTQwJSIgaGVpZ2h0PSIxNDAlIj4KICAgICAgPGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMyIgcmVzdWx0PSJibHVyIiAvPgogICAgICA8ZmVNZXJnZT4KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+CiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJTb3VyY2VHcmFwaGljIiAvPgogICAgICA8L2ZlTWVyZ2U+CiAgICA8L2ZpbHRlcj4KICA8L2RlZnM+CiAgPHBhdGggZD0iTTI1IDI1IEg3NSBMMjUgNzUgSDc1IiBzdHJva2U9InVybCgjei1nbG93KSIgc3Ryb2tlLXdpZHRoPSI2IiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWx0ZXI9InVybCgjbmVvbi1ibHVyKSIgLz4KICA8cGF0aCBkPSJNMjUgMjUgTDUwIDUwIEw3NSAyNSBNMjUgNzUgTDUwIDUwIEw3NSA3NSBNNDAgMjUgTDI1IDUwIEw2MCA3NSIgc3Ryb2tlPSJ1cmwoI3otZ2xvdykiIHN0cm9rZS13aWR0aD0iMiIgb3BhY2l0eT0iMC42IiAvPgogIDxjaXJjbGUgY3g9IjI1IiBjeT0iMjUiIHI9IjQiIGZpbGw9IiMwMEU1RkYiIC8+CiAgPGNpcmNsZSBjeD0iNzUiIGN5PSIyNSIgcj0iNCIgZmlsbD0iIzAwRTVGRiIgLz4KICA8Y2lyY2xlIGN4PSIyNSIgY3k9Ijc1IiByPSI0IiBmaWxsPSIjQjIwMEZGIiAvPgogIDxjaXJjbGUgY3g9Ijc1IiBjeT0iNzUiIHI9IjQiIGZpbGw9IiNCMjAwRkYiIC8+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMyIgZmlsbD0iIzY2NzdGRiIgLz4KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjI1IiByPSIyLjUiIGZpbGw9IiMwMEU1RkYiIC8+CiAgPGNpcmNsZSBjeD0iNjAiIGN5PSI3NSIgcj0iMi41IiBmaWxsPSIjQjIwMEZGIiAvPgogIDxjaXJjbGUgY3g9IjI1IiBjeT0iNTAiIHI9IjIuNSIgZmlsbD0iIzMzQUFGRiIgLz4KPC9zdmc+";

export const metadata: Metadata = {
  title: "Attendance Hub | Multi-Tenant Faculty Attendance & Anti-Cheat Kiosk",
  description: "Enterprise-grade multi-tenant attendance management with dynamic TOTP anti-cheat kiosks and geofencing verification.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: `data:image/svg+xml;base64,${FAVICON_BASE64}`, type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: `data:image/svg+xml;base64,${FAVICON_BASE64}`,
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Attendance Hub",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href={`data:image/svg+xml;base64,${FAVICON_BASE64}`} />
        <link rel="alternate icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        {/* Native Mobile PWA Meta Tags */}
        <meta name="application-name" content="Attendance Hub" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Attendance Hub" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#0d9488" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="antialiased min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col font-sans">
        <Toaster position="top-right" richColors closeButton />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
