import "server-only";

import { redirect } from "next/navigation";
import type { RouteHandler } from "@/lib/logging/logger";
import { getSessionToken } from "./cookies";
import { type AuthenticatedSession, findSessionByToken } from "./sessions";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "UnauthenticatedError";
  }
}

export async function getSession(): Promise<AuthenticatedSession | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return findSessionByToken(token);
}

export async function requireSession(): Promise<AuthenticatedSession> {
  const session = await getSession();
  if (!session) throw new UnauthenticatedError();
  return session;
}

export async function requirePageSession(): Promise<AuthenticatedSession> {
  try {
    return await requireSession();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect("/login");
    }
    throw error;
  }
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return false;

  try {
    const requestOrigin = new URL(request.url).origin;
    const headerOrigin = new URL(origin).origin;
    return requestOrigin === headerOrigin;
  } catch {
    return false;
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD"]);

export function withApiAuthentication<Arguments extends unknown[]>(
  handler: (
    request: Request,
    ...argsAndSession: [...Arguments, AuthenticatedSession]
  ) => Promise<Response>,
): RouteHandler<Arguments> {
  return async (request, ...args) => {
    const session = await getSession();

    if (!session) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!SAFE_METHODS.has(request.method) && !isSameOrigin(request)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(request, ...args, session);
  };
}
