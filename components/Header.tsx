"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/login/actions";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
import type { UserRole } from "@/lib/auth/roles";

const navigationItems = [
  { href: "/", label: "Home" },
  { href: "/calendar", label: "Calendar" },
  { href: "/events", label: "Events" },
  { href: "/updates", label: "Updates" },
];

type HeaderProps = {
  activeUserName: string;
  role: UserRole;
};

export function Header({
  activeUserName,
  role,
}: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleNavigationItems = role === "Admin"
    ? [...navigationItems, { href: "/admin", label: "Admin" }]
    : navigationItems;

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
        {visibleNavigationItems.map(({ href, label }) => (
          <PixelButton
            key={href}
            className="header-button"
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
            decorative
          />
          {activeUserName}
        </span>
        <form action={logoutAction}>
          <PixelButton type="submit" className="header-button">
            Logout
          </PixelButton>
        </form>
      </div>

      <div className="mobile-actions">
        <span className="mobile-user-display">
          <UserAvatar
            name={activeUserName}
            decorative
          />
        </span>

        <button
          className="menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Image
            className="menu-icon menu-icon-default"
            src={
              menuOpen
                ? "/images/menu-open.png"
                : "/images/menu-closed.png"
            }
            alt=""
            width={64}
            height={64}
            unoptimized
          />
          <Image
            className="menu-icon menu-icon-hover"
            src={
              menuOpen
                ? "/images/menu-open-hover.png"
                : "/images/menu-closed-hover.png"
            }
            alt=""
            width={64}
            height={64}
            unoptimized
          />
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-navigation">
          {renderNavigation("mobile-navigation")}
          <div className="mobile-logout">
            <form action={logoutAction}>
              <PixelButton type="submit" className="header-button">
                Logout
              </PixelButton>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
