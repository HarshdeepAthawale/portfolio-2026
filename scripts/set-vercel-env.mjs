#!/usr/bin/env node
/**
 * Push the secrets in .env.local up to your Vercel project's environment vars.
 *
 * Prereqs:
 *   1. Vercel CLI installed and logged in:  vercel login
 *   2. This folder linked to the project:   vercel link
 *   3. Secrets present in .env.local
 *
 * Usage:
 *   node scripts/set-vercel-env.mjs                 # all 3 targets, keys from PUSH_KEYS
 *   node scripts/set-vercel-env.mjs production      # only production
 *   node scripts/set-vercel-env.mjs production preview
 *   node scripts/set-vercel-env.mjs --all           # every non-empty key in .env.local
 *
 * Each variable is removed first (if it exists) then re-added, so re-running is safe.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Keys pushed by default. Add more here, or pass --all to push everything set.
const PUSH_KEYS = [
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "SPOTIFY_REFRESH_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

const ALL_TARGETS = ["production", "preview", "development"];

const args = process.argv.slice(2);
const pushAll = args.includes("--all");
const dryRun = args.includes("--dry-run");
const targets = args.filter((a) => ALL_TARGETS.includes(a));
const chosenTargets = targets.length > 0 ? targets : ALL_TARGETS;

const CLI_ENV = {
  ...process.env,
  VERCEL_TELEMETRY_DISABLED: "1",
  NO_UPDATE_NOTIFIER: "1",
};

function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    console.error("\n✗ Could not read .env.local. Create it first.\n");
    process.exit(1);
  }
  const vars = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      const value = m[2].trim();
      if (value) vars[m[1]] = value;
    }
  }
  return vars;
}

function mask(value) {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function vercel(cliArgs, input) {
  return spawnSync("vercel", cliArgs, {
    input,
    encoding: "utf8",
    shell: true, // resolves vercel.cmd on Windows
    env: CLI_ENV,
  });
}

function ensureLinked() {
  const res = vercel(["whoami"]);
  if (res.status !== 0) {
    console.error(
      "\n✗ Vercel CLI not ready. Run `vercel login` and `vercel link` first.\n",
    );
    process.exit(1);
  }
  console.log(`✓ Vercel account: ${(res.stdout || "").trim()}`);
}

function setVar(key, value, target) {
  if (dryRun) {
    console.log(`  • would set ${key} → ${target} (${mask(value)})`);
    return;
  }
  // Remove first so re-runs don't fail on "already exists"; ignore its result.
  vercel(["env", "rm", key, target, "--yes"]);
  const res = vercel(["env", "add", key, target], value);
  if (res.status === 0) {
    console.log(`  ✓ ${key} → ${target} (${mask(value)})`);
  } else {
    console.error(`  ✗ ${key} → ${target} failed`);
    if (res.stderr) console.error(`    ${res.stderr.trim().split("\n").pop()}`);
  }
}

function main() {
  const vars = loadEnvLocal();
  const keys = pushAll ? Object.keys(vars) : PUSH_KEYS.filter((k) => vars[k]);

  if (keys.length === 0) {
    console.error(
      "\n✗ No matching keys found in .env.local.\n" +
        `  Looked for: ${PUSH_KEYS.join(", ")}\n` +
        "  (or pass --all to push every key that is set)\n",
    );
    process.exit(1);
  }

  if (!dryRun) ensureLinked();
  console.log(
    `\n${dryRun ? "[dry run] " : ""}${dryRun ? "Would push" : "Pushing"} ${
      keys.length
    } var(s) to [${chosenTargets.join(", ")}]:\n`,
  );

  for (const key of keys) {
    for (const target of chosenTargets) {
      setVar(key, vars[key], target);
    }
  }

  if (dryRun) {
    console.log("\n[dry run] Nothing was sent. Re-run without --dry-run to apply.\n");
  } else {
    console.log(
      "\nDone. Redeploy for the changes to take effect:\n  vercel --prod\n",
    );
  }
}

main();
