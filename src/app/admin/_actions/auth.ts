"use server";

import { redirect } from "next/navigation";
import { adminEnv, isAdminConfigured, isTotpEnabled } from "@/lib/admin/env";
import { safeEqual, verifyPassword } from "@/lib/admin/password";
import {
  clearLoginAttempts,
  clientIp,
  registerLoginAttempt,
  registerLoginFailure,
} from "@/lib/admin/rate-limit";
import { createSession, destroyAllSessions, destroySession } from "@/lib/admin/session";
import { verifyTotp } from "@/lib/admin/totp";

export type LoginState = { error?: string };

/** Only same-site admin paths; never an open redirect. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return /^\/admin(?:\/[A-Za-z0-9/_-]*)?$/.test(next) && !next.startsWith("/admin/login") ? next : "/admin";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) {
    return { error: "Admin sign-in isn't set up yet. Run scripts/admin-setup.mjs." };
  }

  const ip = await clientIp();
  const wait = await registerLoginAttempt(ip);
  if (wait > 0) {
    return { error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} min.` };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(formData.get("password") ?? "").slice(0, 256);
  const code = String(formData.get("code") ?? "").replace(/\s/g, "").slice(0, 6);

  // Every check runs (and the slow hash always runs) so the response and its
  // timing don't reveal which part was wrong.
  const emailOk = safeEqual(email, adminEnv.email());
  const passwordOk = await verifyPassword(password, adminEnv.passwordHash());
  const codeOk = isTotpEnabled()
    ? emailOk && passwordOk && (await verifyTotp(adminEnv.totpSecret(), code))
    : true;

  if (!(emailOk && passwordOk && codeOk)) {
    await registerLoginFailure();
    console.warn("[admin] sign-in failed");
    return { error: isTotpEnabled() ? "Incorrect email, password or code." : "Incorrect email or password." };
  }

  await clearLoginAttempts(ip);
  await createSession();
  console.info("[admin] signed in");
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

export async function logoutEverywhere() {
  await destroyAllSessions();
  console.info("[admin] signed out everywhere");
  redirect("/admin/login");
}
