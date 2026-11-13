import type { AuthenticatedSession } from "@/lib/auth/sessions";
import { Header } from "@/components/Header";
import packageJson from "@/package.json";

type Props = {
  session: AuthenticatedSession;
  children: React.ReactNode;
};

export function AuthenticatedShell({ session, children }: Props) {
  return (
    <>
      <Header
        activeUserName={session.user.name}
        role={session.user.role}
      />
      {children}
      <footer className="site-footer">
        Plan Your Chaos v{packageJson.version}
      </footer>
    </>
  );
}
