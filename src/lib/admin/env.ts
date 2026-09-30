/** Admin configuration, all from env vars (never hard-coded; see scripts/admin-setup.mjs). */
export const adminEnv = {
  email: () => process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "",
  passwordHash: () => process.env.ADMIN_PASSWORD_HASH ?? "",
  totpSecret: () => process.env.ADMIN_TOTP_SECRET?.trim() ?? "",
  githubToken: () => process.env.GITHUB_TOKEN ?? "",
  githubRepo: () => process.env.GITHUB_REPO ?? "HarshdeepAthawale/portfolio-2026",
  githubBranch: () => process.env.GITHUB_BRANCH ?? "main",
};

export function isAdminConfigured() {
  return Boolean(adminEnv.email() && adminEnv.passwordHash());
}

/** Two-factor codes are required whenever a TOTP secret is set. */
export function isTotpEnabled() {
  return Boolean(adminEnv.totpSecret());
}
