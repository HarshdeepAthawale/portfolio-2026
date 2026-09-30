"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/_actions/auth";
import { inputClass, labelClass, primaryButtonClass } from "@/app/admin/_components/styles";

export function LoginForm({ totp, next }: { totp: boolean; next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className={labelClass}>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className={labelClass}>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          className={inputClass}
        />
      </label>
      {totp && (
        <label className="block">
          <span className={labelClass}>Authenticator code</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            required
            placeholder="123 456"
            className={`${inputClass} font-mono tracking-[0.3em]`}
          />
        </label>
      )}
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
