import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const defaultFont = localFont({
  src: "./fonts/Silkscreen-Regular.ttf",
  variable: "--font-default",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Plan Your Chaos",
  description: "A local-first household calendar.",
  applicationName: "Plan Your Chaos",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Plan Your Chaos",
    statusBarStyle: "black",
  },
  icons: {
    icon: "/images/logoSmall.png",
    apple: "/images/logo192px.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A1026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={defaultFont.variable}>
      <body>{children}</body>
    </html>
  );
}
