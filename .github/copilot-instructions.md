# GitHub Copilot Instructions

## Project

Plan Your Chaos is a local-first household calendar built with **Next.js** and **TypeScript**.

The application should be simple, fast, and feel like a handmade pixel-art game rather than a modern SaaS application.

## Design Principles

- Everything should reinforce the pixel-art aesthetic.
- Use handmade pixel-art assets.
- Keep the interface clean and uncluttered.
- Prioritize readability and usability over decoration.
- Reuse existing components and assets before creating new ones.

## Visual Style

Avoid modern UI trends such as:

- Glassmorphism
- Gradients
- Blur effects
- Rounded pill-shaped controls
- Generic dashboard styling

Prefer:

- Chunky borders
- Hard edges
- Limited colours
- Pixel-perfect spacing
- Solid (non-blurred) shadows
- Small, responsive animations
- Sprite-based interactions where appropriate

## Colour Palette

Only use these colours unless there is a compelling reason not to.

| Name       | Colour    |
| ---------- | --------- |
| Background | `#1A1026` |
| Surface    | `#2E1852` |
| Primary    | `#4B2E83` |
| Gold       | `#DEAB15` |
| Yellow     | `#F2C900` |
| Highlight  | `#F5E580` |
| Light Purple | `#D8C7FF` |
| Dark Teal | `#216B6A` |
| Teal | `#3FA7A3` |
| Highlight Teal | `#82D8D2` |
| Dark Pink | `#A84F68` |
| Pink | `#E58AA4` |
| Highlight Pink | `#F6C1D0` |

## Typography

Use **Silkscreen** as the primary UI font.

Optimise for readability. Decorative fonts may be introduced later for branding or headings, but should never reduce usability.

## Assets

- Store fonts in `app/fonts`.
- Store pixel-art assets in `public/assets`.
- Use local assets whenever possible.
- Preserve crisp pixel rendering.

## Code Style

- Use TypeScript.
- Prefer Server Components.
- Only use `"use client"` when necessary.
- Keep components small and focused.
- Avoid unnecessary abstractions.
- Write clear, maintainable code.
- Avoid introducing new dependencies unless they provide significant value.

## Components

Build reusable UI components for recurring patterns.

Examples include:

- Calendar
- CalendarDay
- EventCard
- UpcomingEvents
- PixelButton
- PixelPanel

## Accessibility

- Use semantic HTML.
- Support keyboard navigation.
- Provide visible focus states.
- Use sufficient colour contrast.
- Do not rely on colour alone to communicate information.

## Responsive Design

- The application should work well on desktop, tablet, and mobile devices.
- Desktop is the primary experience, but all features should remain fully usable on smaller screens.
- Prefer responsive layouts over separate mobile and desktop implementations.
- Keep touch interactions comfortable on mobile where applicable.
- Avoid fixed widths that break on smaller screens.

## Copilot Guidelines

When generating code:

1. Follow existing project conventions.
2. Keep implementations simple.
3. Reuse existing components whenever possible.
4. Preserve the pixel-art identity.
5. Do not introduce unnecessary complexity.
6. Keep the calendar and upcoming events as the primary focus of the application.
