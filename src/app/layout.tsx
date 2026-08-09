import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLocale, isRtl } from "@/lib/i18n";
import Script from "next/script";
import NativeInit from "./native-init";

export const metadata: Metadata = {
  title: "RG — Salon SaaS",
  description: "All-in-one salon management: bookings, POS, staff, and customer management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RG",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#5b3b6e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"}>
      <body>
        {children}
        <NativeInit />
        <Script id="sw-register" strategy="afterInteractive">{`
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js");
          }
        `}</Script>
      </body>
    </html>
  );
}
