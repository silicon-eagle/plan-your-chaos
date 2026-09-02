import type { Metadata } from "next";
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
  icons: {
    icon: "/images/logoSmall.png",
  },
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
