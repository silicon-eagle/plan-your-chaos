"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/login/actions";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";

const navigationItems = [
  { href: "/", label: "Home" },
  { href: "/calendar", label: "Calendar" },
  { href: "/events", label: "Events" },
];

type HeaderProps = {
  activeUserName: string;
  activeUserAvatarPath: string | null;
};

export function Header({
  activeUserName,
  activeUserAvatarPath,
}: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function renderNavigation(className: string) {
    return (
      <nav className={className} aria-label="Main navigation">
        {navigationItems.map(({ href, label }) => (
          <PixelButton
            key={href}
            href={href}
            selected={pathname === href}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </PixelButton>
        ))}
      </nav>
    );
  }

  return (
    <header className="site-header">
      <Link className="site-title" href="/">
        <picture>
          <source media="(max-width: 42rem)" srcSet="/images/logo.png" />
          <Image
            className="pixel-art"
            src="/images/logo_flat.png"
            alt="Plan Your Chaos"
            width={176}
            height={64}
            unoptimized
          />
        </picture>
      </Link>

      <div className="desktop-actions">
        {renderNavigation("desktop-navigation")}
        <span className="active-user-display desktop-user">
          <UserAvatar
            name={activeUserName}
            src={activeUserAvatarPath}
            decorative
          />
          {activeUserName}
        </span>
        <form action={logoutAction}>
          <PixelButton type="submit">Logout</PixelButton>
        </form>
      </div>

      <div className="mobile-actions">
        <span className="mobile-user-display">
          <UserAvatar
            name={activeUserName}
            src={activeUserAvatarPath}
            decorative
          />
        </span>

        <PixelButton
          className="menu-button"
          type="button"
          selected={menuOpen}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </PixelButton>
      </div>

      {menuOpen && (
        <div id="mobile-navigation">
          {renderNavigation("mobile-navigation")}
          <div className="mobile-logout">
            <form action={logoutAction}>
              <PixelButton type="submit">Logout</PixelButton>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
