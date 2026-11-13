import packageJson from "@/package.json";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      © {new Date().getFullYear()} Tim Kelch. All rights reserved. | Version{" "}
      {packageJson.version}
    </footer>
  );
}
