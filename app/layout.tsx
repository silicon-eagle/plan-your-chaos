import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pixelifySans = localFont({
  src: "./fonts/PixelifySans-VariableFont_wght.ttf",
  variable: "--font-pixelify-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plan Your Chaos",
  description: "A local-first household calendar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pixelifySans.variable}>
      <body>{children}</body>
    </html>
  );
}
