import { beforeEach, describe, expect, it, vi } from "vitest";
import type { beginLogin as realBeginLogin } from "@/lib/auth/login";

const mocks = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  revokeSessionByToken: vi.fn(),
  beginLogin: vi.fn<typeof realBeginLogin>(),
  completeTotpLogin: vi.fn(),
  completePasswordSetup: vi.fn(),
  beginTotpEnrollment: vi.fn(),
  completeTotpEnrollment: vi.fn(),
  redirect: vi.fn(),
  loggerInfo: vi.fn(),
  qrToDataURL: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/cookies", () => ({ getSessionToken: mocks.getSessionToken }));
vi.mock("@/lib/auth/sessions", () => ({
  revokeSessionByToken: mocks.revokeSessionByToken,
}));
vi.mock("@/lib/auth/login", () => ({
  beginLogin: mocks.beginLogin,
  completeTotpLogin: mocks.completeTotpLogin,
  completePasswordSetup: mocks.completePasswordSetup,
  beginTotpEnrollment: mocks.beginTotpEnrollment,
  completeTotpEnrollment: mocks.completeTotpEnrollment,
}));
vi.mock("@/lib/logging/logger", () => ({
  logger: { info: mocks.loggerInfo },
}));
vi.mock("qrcode", () => ({ default: { toDataURL: mocks.qrToDataURL } }));

import {
  enrollTotpAction,
  loginAction,
  loginFlowAction,
  logoutAction,
  setPasswordAction,
  verifyTotpAction,
} from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── loginAction ────────────────────────────────────────────────────────────

describe("loginAction", () => {
  it("returns an error for an empty username", async () => {
    const fd = new FormData();
    fd.set("username", "   ");
    fd.set("password", "pass");

    const result = await loginAction(fd);

    expect(result.error).toBe("Enter your username.");
    expect(mocks.beginLogin).not.toHaveBeenCalled();
  });

  it("returns set_password step when beginLogin requires it", async () => {
    mocks.beginLogin.mockResolvedValue({ status: "set_password" });
    const fd = new FormData();
    fd.set("username", " AdMiN ");
    fd.set("password", "CaseSensitive Password!");

    const result = await loginAction(fd);

    expect(mocks.beginLogin).toHaveBeenCalledWith({
      username: "AdMiN", password: "CaseSensitive Password!",
    });
    expect(result.step).toBe("set_password");
  });

  it("returns verify_totp after password validation", async () => {
    mocks.beginLogin.mockResolvedValue({ status: "verify_totp" });
    const fd = new FormData();
    fd.set("username", "Admin");
    fd.set("password", "pass");

    const result = await loginAction(fd);

    expect(mocks.beginLogin).toHaveBeenCalledWith({
      username: "Admin",
      password: "pass",
    });
    expect(result).toEqual({ step: "verify_totp" });
  });

  it("returns an error message on invalid credentials", async () => {
    mocks.beginLogin.mockResolvedValue({
      status: "invalid",
      message: "Invalid credentials.",
    });
    const fd = new FormData();
    fd.set("username", "Admin");
    fd.set("password", "wrong");

    const result = await loginAction(fd);

    expect(result.error).toBe("Invalid credentials.");
  });
});

// ── verifyTotpAction ──────────────────────────────────────────────────────

describe("verifyTotpAction", () => {
  it("renders password setup after successful TOTP for a temporary password", async () => {
    mocks.completeTotpLogin.mockResolvedValue({ status: "set_password" });
    const fd = new FormData();
    fd.set("code", "123456");

    expect(await verifyTotpAction(fd)).toEqual({ step: "set_password" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("keeps the verify_totp step after an invalid code", async () => {
    mocks.completeTotpLogin.mockResolvedValue({
      status: "invalid",
      message: "Invalid credentials.",
    });
    const fd = new FormData();
    fd.set("code", "000000");

    const result = await verifyTotpAction(fd);

    expect(result).toEqual({
      step: "verify_totp",
      error: "Invalid credentials.",
    });
  });

  it("redirects to / on authenticated code", async () => {
    mocks.completeTotpLogin.mockResolvedValue({ status: "authenticated" });
    const fd = new FormData();
    fd.set("code", "123456");

    await verifyTotpAction(fd);

    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("returns an expiration error without a step", async () => {
    mocks.completeTotpLogin.mockResolvedValue({
      status: "expired",
      message: "Verification expired.",
    });
    const fd = new FormData();
    fd.set("code", "123456");

    const result = await verifyTotpAction(fd);

    expect(result).toEqual({ error: "Verification expired." });
  });
});

// ── setPasswordAction ──────────────────────────────────────────────────────

describe("setPasswordAction", () => {
  it("redirects to / when completePasswordSetup authenticates", async () => {
    mocks.completePasswordSetup.mockResolvedValue({ status: "authenticated" });
    const fd = new FormData();
    fd.set("password", "newPass1");
    fd.set("confirmation", "newPass1");

    await setPasswordAction(fd);

    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("calls beginTotpEnrollment and returns enroll_totp step", async () => {
    mocks.completePasswordSetup.mockResolvedValue({ status: "enroll_totp" });
    mocks.beginTotpEnrollment.mockResolvedValue({
      status: "enroll_totp",
      manualSecret: "SECRET",
      uri: "otpauth://totp/label?secret=SECRET",
    });
    mocks.qrToDataURL.mockResolvedValue("data:image/png;base64,qr");

    const fd = new FormData();
    fd.set("password", "newPass1");
    fd.set("confirmation", "newPass1");

    const result = await setPasswordAction(fd);

    expect(mocks.completePasswordSetup).toHaveBeenCalled();
    expect(result.step).toBe("enroll_totp");
    expect(result.totpQrDataUrl).toBe("data:image/png;base64,qr");
    expect(result.totpManualSecret).toBe("SECRET");
  });

  it("returns an error message on setup failure", async () => {
    mocks.completePasswordSetup.mockResolvedValue({
      status: "invalid",
      message: "Passwords do not match.",
    });
    const fd = new FormData();
    fd.set("password", "a");
    fd.set("confirmation", "b");

    const result = await setPasswordAction(fd);

    expect(result.error).toBe("Passwords do not match.");
  });
});

// ── enrollTotpAction ───────────────────────────────────────────────────────

describe("enrollTotpAction", () => {
  const prevState = {
    step: "enroll_totp" as const,
    totpQrDataUrl: "data:image/png;base64,qr",
    totpManualSecret: "JBSWY3DPEHPK3PXP",
  };

  it("redirects to / on successful TOTP enrollment", async () => {
    mocks.completeTotpEnrollment.mockResolvedValue({ status: "authenticated" });
    const fd = new FormData();
    fd.set("code", "123456");

    await enrollTotpAction(prevState, fd);

    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("preserves QR data and returns error on invalid code", async () => {
    mocks.completeTotpEnrollment.mockResolvedValue({
      status: "invalid",
      message: "Invalid verification code.",
    });
    const fd = new FormData();
    fd.set("code", "000000");

    const result = await enrollTotpAction(prevState, fd);

    expect(mocks.completeTotpEnrollment).toHaveBeenCalled();
    expect(result.error).toBe("Invalid verification code.");
    expect(result.totpQrDataUrl).toBe(prevState.totpQrDataUrl);
    expect(result.totpManualSecret).toBe(prevState.totpManualSecret);
  });
});

// ── loginFlowAction dispatch ───────────────────────────────────────────────

describe("loginFlowAction dispatch", () => {
  it("dispatches _action=login to loginAction", async () => {
    mocks.beginLogin.mockResolvedValue({
      status: "invalid",
      message: "Bad credentials",
    });
    const fd = new FormData();
    fd.set("_action", "login");
    fd.set("username", "Admin");
    fd.set("password", "pass");
    fd.set("totpCode", "");

    const result = await loginFlowAction({}, fd);

    expect(mocks.beginLogin).toHaveBeenCalled();
    expect(result.error).toBe("Bad credentials");
  });

  it("dispatches _action=set_password to setPasswordAction", async () => {
    mocks.completePasswordSetup.mockResolvedValue({
      status: "invalid",
      message: "Too short.",
    });
    const fd = new FormData();
    fd.set("_action", "set_password");
    fd.set("password", "x");
    fd.set("confirmation", "x");

    const result = await loginFlowAction({}, fd);

    expect(mocks.completePasswordSetup).toHaveBeenCalled();
    expect(result.error).toBe("Too short.");
  });

  it("dispatches _action=enroll_totp to enrollTotpAction", async () => {
    mocks.completeTotpEnrollment.mockResolvedValue({
      status: "invalid",
      message: "Invalid code.",
    });
    const fd = new FormData();
    fd.set("_action", "enroll_totp");
    fd.set("code", "000000");

    const result = await loginFlowAction(
      {
        step: "enroll_totp",
        totpQrDataUrl: "data:x",
        totpManualSecret: "S",
      },
      fd,
    );

    expect(mocks.completeTotpEnrollment).toHaveBeenCalled();
    expect(result.error).toBe("Invalid code.");
  });

  it("dispatches _action=verify_totp to verifyTotpAction", async () => {
    mocks.completeTotpLogin.mockResolvedValue({
      status: "invalid",
      message: "Invalid code.",
    });
    const fd = new FormData();
    fd.set("_action", "verify_totp");
    fd.set("code", "000000");

    const result = await loginFlowAction({}, fd);

    expect(mocks.completeTotpLogin).toHaveBeenCalledWith("000000");
    expect(result).toEqual({ step: "verify_totp", error: "Invalid code." });
  });

  it("returns an error for unknown _action", async () => {
    const fd = new FormData();
    fd.set("_action", "unknown_action");

    const result = await loginFlowAction({}, fd);

    expect(result.error).toBe("Invalid action.");
  });
});

// ── logoutAction ───────────────────────────────────────────────────────────

describe("logoutAction", () => {
  it("calls revokeSessionByToken with the current token", async () => {
    mocks.getSessionToken.mockResolvedValue("tok-abc123");
    mocks.revokeSessionByToken.mockResolvedValue(undefined);

    await logoutAction();

    expect(mocks.revokeSessionByToken).toHaveBeenCalledWith(
      "tok-abc123",
      "user_logout",
    );
  });

  it("redirects to /login after revoking the session", async () => {
    mocks.getSessionToken.mockResolvedValue("tok-abc123");
    mocks.revokeSessionByToken.mockResolvedValue(undefined);

    await logoutAction();

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("logs auth.logout without exposing the session token", async () => {
    mocks.getSessionToken.mockResolvedValue("tok-abc123");
    mocks.revokeSessionByToken.mockResolvedValue(undefined);

    await logoutAction();

    expect(mocks.loggerInfo).toHaveBeenCalledWith("auth.logout");
    expect(mocks.loggerInfo).not.toHaveBeenCalledWith(
      expect.stringContaining("tok-abc123"),
    );
  });

  it("redirects to /login even when no session token exists", async () => {
    mocks.getSessionToken.mockResolvedValue(undefined);

    await logoutAction();

    expect(mocks.revokeSessionByToken).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
