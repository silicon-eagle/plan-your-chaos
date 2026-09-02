"use server";

import { redirect } from "next/navigation";
import QRCode from "qrcode";
import {
  beginLogin,
  beginTotpEnrollment,
  completePasswordSetup,
  completeTotpEnrollment,
} from "@/lib/auth/login";
import { getSessionToken } from "@/lib/auth/cookies";
import { revokeSessionByToken } from "@/lib/auth/sessions";
import { logger } from "@/lib/logging/logger";

export type LoginFormState = {
  error?: string;
  step?: "login" | "set_password" | "enroll_totp";
  totpQrDataUrl?: string;
  totpManualSecret?: string;
};

export async function loginFlowAction(
  prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const action = formData.get("_action") as string;

  if (action === "login") {
    return loginAction(formData);
  }
  if (action === "set_password") {
    return setPasswordAction(formData);
  }
  if (action === "enroll_totp") {
    return enrollTotpAction(prevState, formData);
  }

  return { error: "Invalid action." };
}

export async function loginAction(formData: FormData): Promise<LoginFormState> {
  const userId = Number(formData.get("userId"));
  const password = String(formData.get("password") ?? "");
  const totpCode = String(formData.get("totpCode") ?? "");

  if (!Number.isInteger(userId) || userId <= 0) {
    return { error: "Please select a household member." };
  }

  const result = await beginLogin({ userId, password, totpCode });

  if (result.status === "authenticated") {
    redirect("/");
  }
  if (result.status === "set_password") {
    return { step: "set_password" };
  }
  if (result.status === "enroll_totp") {
    return prepareEnrollTotp();
  }
  return { error: result.message };
}

export async function setPasswordAction(
  formData: FormData,
): Promise<LoginFormState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const result = await completePasswordSetup({ password, confirmation });

  if (result.status === "authenticated") {
    redirect("/");
  }
  if (result.status === "enroll_totp") {
    return prepareEnrollTotp();
  }
  return { error: result.message };
}

export async function enrollTotpAction(
  prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const code = String(formData.get("code") ?? "");

  const result = await completeTotpEnrollment(code);

  if (result.status === "authenticated") {
    redirect("/");
  }

  return {
    error: "message" in result ? result.message : undefined,
    step: "enroll_totp",
    totpQrDataUrl: prevState.totpQrDataUrl,
    totpManualSecret: prevState.totpManualSecret,
  };
}

async function prepareEnrollTotp(): Promise<LoginFormState> {
  const enrollment = await beginTotpEnrollment();
  if (enrollment.status === "expired") {
    return { error: enrollment.message };
  }
  const qrDataUrl = await QRCode.toDataURL(enrollment.uri, {
    margin: 0,
    width: 200,
    color: { dark: "#1A1026", light: "#D8C7FF" },
  });
  return {
    step: "enroll_totp",
    totpQrDataUrl: qrDataUrl,
    totpManualSecret: enrollment.manualSecret,
  };
}

export async function logoutAction(): Promise<never> {
  const token = await getSessionToken();
  if (token) {
    await revokeSessionByToken(token, "user_logout");
    logger.info("auth.logout");
  }
  redirect("/login");
}
