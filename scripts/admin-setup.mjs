#!/usr/bin/env node
/**
 * Sets up /admin sign-in. Asks for your email and a password (hidden), then writes
 * to .env.local (gitignored):
 *
 *   ADMIN_EMAIL          your sign-in email
 *   ADMIN_PASSWORD_HASH  a scrypt hash - the password itself is never stored
 *   ADMIN_TOTP_SECRET    two-factor secret for an authenticator app (optional, off by default)
 *
 * Then push them to Vercel:  node scripts/set-vercel-env.mjs production
 *
 * Usage: node scripts/admin-setup.mjs
 * Nothing here is sent anywhere; the TOTP secret is shown only in this terminal.
 */
import { randomBytes, scrypt } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import readline from "node:readline";

const ENV_FILE = new URL("../.env.local", import.meta.url);
const LOG_N = 17; // scrypt N = 2^17, r = 8, p = 1 (OWASP recommendation)

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => (rl.close(), resolve(answer.trim()))));
}

function askHidden(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  let prompted = false;
  // Echo the prompt once, then mask everything typed.
  rl._writeToOutput = (text) => {
    if (!prompted) {
      process.stdout.write(text);
      prompted = true;
    } else if (text.includes("\n") || text.includes("\r")) {
      process.stdout.write("\n");
    }
  };
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    }),
  );
}

function hashPassword(password) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, 32, { N: 2 ** LOG_N, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(`scrypt:${LOG_N}:8:1:${salt.toString("base64url")}:${key.toString("base64url")}`),
    ),
  );
}

function base32(buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

function upsertEnv(vars) {
  let text = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  for (const [key, value] of Object.entries(vars)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    text = pattern.test(text) ? text.replace(pattern, line) : `${text.replace(/\n?$/, "\n")}${line}\n`;
  }
  writeFileSync(ENV_FILE, text);
}

console.log("\nAdmin sign-in setup\n");

const email = (await ask("Email: ")).toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("✗ That doesn't look like an email.");
  process.exit(1);
}

console.log("Use a new password you don't use anywhere else (a passphrase is great, 12+ characters).");
const password = await askHidden("Password: ");
if (password.length < 12) {
  console.error("✗ Use at least 12 characters.");
  process.exit(1);
}
if (password !== (await askHidden("Repeat password: "))) {
  console.error("✗ The passwords don't match.");
  process.exit(1);
}

process.stdout.write("Hashing… ");
const hash = await hashPassword(password);
console.log("done.");

const vars = { ADMIN_EMAIL: email, ADMIN_PASSWORD_HASH: hash };

const wantTotp = (await ask("Also require authenticator codes (two-factor)? [y/N] ")).toLowerCase() === "y";
if (wantTotp) {
  const secret = base32(randomBytes(20));
  vars.ADMIN_TOTP_SECRET = secret;
  const label = encodeURIComponent(`Portfolio admin:${email}`);
  console.log(`
Add this to your authenticator app (Google Authenticator, 1Password, Authy…)
using "Enter a setup key":

  Account:  Portfolio admin
  Key:      ${secret.match(/.{1,4}/g).join(" ")}
  Type:     Time based

Or, if your app accepts links:
  otpauth://totp/${label}?secret=${secret}&issuer=Portfolio%20admin

Don't paste the key into an online QR generator: it would expose it.`);
}

upsertEnv(vars);
console.log(`
✓ Saved ${Object.keys(vars).join(", ")} to .env.local

Next:
  1. Publishing needs a GitHub token. Create a fine-grained token at
     https://github.com/settings/personal-access-tokens/new
       - Repository access: only HarshdeepAthawale/portfolio-2026
       - Permissions: Contents (read and write), Commit statuses (read-only)
     Add it to .env.local as GITHUB_TOKEN=...
  2. Push everything to Vercel:  node scripts/set-vercel-env.mjs production
  3. Redeploy, then sign in at /admin
`);
