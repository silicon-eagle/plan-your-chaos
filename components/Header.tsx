"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigationItems = [
  { href: "/", label: "Calendar" },
  { href: "/upcoming", label: "Upcoming Events" },
];

type HeaderProps = {
  activeUserName: string;
};

export function Header({ activeUserName }: HeaderProps) {
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
          <Link
            key={href}
            className="pixel-border pixel-border-interactive"
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  function renderActiveUser(className: string) {
    return (
      <Link
        className={`pixel-border pixel-border-interactive ${className}`}
        href="/user"
        aria-label={`User: ${activeUserName}`}
        aria-current={pathname === "/user" ? "page" : undefined}
        onClick={() => setMenuOpen(false)}
      >
        User: {activeUserName}
      </Link>
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
            priority
            unoptimized
          />
        </picture>
      </Link>

      {renderNavigation("desktop-navigation")}
      {renderActiveUser("active-user-link desktop-user")}

      <button
        className="pixel-border pixel-border-interactive menu-button"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      {menuOpen && (
        <div id="mobile-navigation">
          {renderNavigation("mobile-navigation")}
          {renderActiveUser("active-user-link mobile-user")}
        </div>
      )}
    </header>
  );
}
