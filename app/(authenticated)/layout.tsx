import { requirePageSession } from "@/lib/auth/authorization";
import { AuthenticatedShell } from "@/components/AuthenticatedShell";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requirePageSession();
  return <AuthenticatedShell session={session}>{children}</AuthenticatedShell>;
}
