import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/Header";
import { getActiveUser } from "@/lib/auth/active-users";
import packageJson from "@/package.json";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeUser = await getActiveUser();

  return (
    <html lang="en" className={defaultFont.variable}>
      <body>
        <Header
          activeUserName={activeUser.name}
          activeUserAvatarPath={activeUser.avatarPath}
        />
        {children}
        <footer className="site-footer">
          Plan Your Chaos v{packageJson.version}
        </footer>
      </body>
    </html>
  );
}
