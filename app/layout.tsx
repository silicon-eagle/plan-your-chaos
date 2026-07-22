import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/Header";
import { getActiveUser } from "@/lib/auth/active-users";
import "./globals.css";

const defaultFont = localFont({
  src: "./fonts/Silkscreen-Regular.ttf",
  variable: "--font-default",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plan Your Chaos",
  description: "A local-first household calendar.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeUser = await getActiveUser();

  return (
    <html lang="en" className={defaultFont.variable}>
      <body>
        <Header activeUserName={activeUser.name} />
        {children}
      </body>
    </html>
  );
}
