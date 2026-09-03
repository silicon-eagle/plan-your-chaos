import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plan Your Chaos",
    short_name: "Chaos",
    description: "Plan Your Chaos household calendar",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1A1026",
    theme_color: "#1A1026",
    icons: [
      {
        src: "/images/logo192px.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/logo512px.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
