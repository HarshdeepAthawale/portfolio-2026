import { createHash } from "node:crypto";
import fs from "fs/promises";
import path from "path";
import { adminEnv } from "@/lib/admin/env";

/**
 * Reads and commits site content. In production every change is a commit to the
 * GitHub repo (Vercel then redeploys), so git history is the audit log and any
 * change can be reverted. In local dev without a GITHUB_TOKEN, files are written
 * to the working tree instead.
 */

export type RepoFile = { content: Buffer; sha: string };

export type FileChange = {
  path: string;
  /** New content, or null to delete the file. */
  content: Buffer | string | null;
  /**
   * Optimistic concurrency: the blob sha the editor started from (null = the file
   * must not exist yet). The commit is refused if the file changed since.
   */
  expectedSha?: string | null;
};

export type CommitResult = { sha: string; url?: string };

export class ConflictError extends Error {}

// Only these paths can ever be written, whatever a request asks for.
const WRITABLE = [
  /^content\/(blog|projects)\/[a-z0-9]+(?:-[a-z0-9]+)*\.mdx$/,
  /^content\/data\/(hero|experience|achievements|projects|education)\.json$/,
  /^public\/assets\/uploads\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:webp|png|jpg)$/,
  /^public\/assets\/resume\.pdf$/,
  /^public\/assets\/resume-preview\.png$/,
];

// Reads are limited to content and public assets.
const READABLE = /^(?:content|public\/assets)\/(?:[A-Za-z0-9_-]+(?:\.[A-Za-z0-9]+)*\/)*[A-Za-z0-9_-]+(?:\.[A-Za-z0-9]+)*$/;

export function isWritablePath(p: string) {
  return WRITABLE.some((pattern) => pattern.test(p));
}

function assertReadable(p: string) {
  if (!READABLE.test(p) || p.split("/").includes("..")) throw new Error(`Path not allowed: ${p}`);
}

/** Git's blob id, so local and GitHub modes agree on what "unchanged" means. */
export function blobSha(content: Buffer) {
  return createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${content.length}\0`), content]))
    .digest("hex");
}

function githubEnabled() {
  if (adminEnv.githubToken()) return true;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Publishing is not configured (GITHUB_TOKEN missing).");
  }
  return false;
}

// ---------------------------------------------------------------- GitHub

async function gh<T>(pathname: string, init?: RequestInit & { allow404?: boolean }): Promise<T | null> {
  const res = await fetch(`https://api.github.com/repos/${adminEnv.githubRepo()}${pathname}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${adminEnv.githubToken()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });
  if (res.status === 404 && init?.allow404) return null;
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} on ${pathname}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

async function ghRead(p: string): Promise<RepoFile | null> {
  const ref = encodeURIComponent(adminEnv.githubBranch());
  const meta = await gh<{ type: string; sha: string; content?: string; encoding?: string }>(
    `/contents/${encodePath(p)}?ref=${ref}`,
    { allow404: true },
  );
  if (!meta || meta.type !== "file") return null;
  if (meta.encoding === "base64" && meta.content) {
    return { content: Buffer.from(meta.content, "base64"), sha: meta.sha };
  }
  // Files over 1 MB come back without content; fetch the blob instead.
  const blob = await gh<{ content: string }>(`/git/blobs/${meta.sha}`);
  return { content: Buffer.from(blob!.content, "base64"), sha: meta.sha };
}

async function ghList(dir: string) {
  const ref = encodeURIComponent(adminEnv.githubBranch());
  const items = await gh<{ name: string; path: string; sha: string; type: string }[]>(
    `/contents/${encodePath(dir)}?ref=${ref}`,
    { allow404: true },
  );
  return (items ?? []).filter((item) => item.type === "file");
}

async function ghCommit(changes: FileChange[], message: string): Promise<CommitResult> {
  const branch = adminEnv.githubBranch();

  for (let attempt = 0; attempt < 2; attempt++) {
    const ref = await gh<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(branch)}`);
    const head = ref!.object.sha;
    const headCommit = await gh<{ tree: { sha: string } }>(`/git/commits/${head}`);

    await checkExpectations(changes, ghRead);

    const tree = await Promise.all(
      changes.map(async (change) => {
        if (change.content === null) {
          return { path: change.path, mode: "100644", type: "blob", sha: null };
        }
        const content = Buffer.isBuffer(change.content) ? change.content : Buffer.from(change.content);
        const blob = await gh<{ sha: string }>("/git/blobs", {
          method: "POST",
          body: JSON.stringify({ content: content.toString("base64"), encoding: "base64" }),
        });
        return { path: change.path, mode: "100644", type: "blob", sha: blob!.sha };
      }),
    );

    const newTree = await gh<{ sha: string }>("/git/trees", {
      method: "POST",
      body: JSON.stringify({ base_tree: headCommit!.tree.sha, tree }),
    });
    const commit = await gh<{ sha: string; html_url: string }>("/git/commits", {
      method: "POST",
      body: JSON.stringify({ message, tree: newTree!.sha, parents: [head] }),
    });

    // Fast-forward only. If main moved meanwhile, re-check and retry once.
    const res = await fetch(
      `https://api.github.com/repos/${adminEnv.githubRepo()}/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${adminEnv.githubToken()}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sha: commit!.sha, force: false }),
        cache: "no-store",
      },
    );
    if (res.ok) return { sha: commit!.sha, url: commit!.html_url };
    if (res.status !== 422) throw new Error(`GitHub API ${res.status} updating ${branch}`);
  }
  throw new ConflictError("The branch kept moving while publishing. Try again.");
}

// ---------------------------------------------------------------- Local

const root = process.cwd();

async function fsRead(p: string): Promise<RepoFile | null> {
  try {
    const content = await fs.readFile(path.join(root, p));
    return { content, sha: blobSha(content) };
  } catch {
    return null;
  }
}

async function fsList(dir: string) {
  try {
    const entries = await fs.readdir(path.join(root, dir), { withFileTypes: true });
    return Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const p = `${dir}/${entry.name}`;
          return { name: entry.name, path: p, sha: (await fsRead(p))!.sha };
        }),
    );
  } catch {
    return [];
  }
}

async function fsCommit(changes: FileChange[]): Promise<CommitResult> {
  await checkExpectations(changes, fsRead);
  for (const change of changes) {
    const target = path.join(root, change.path);
    if (change.content === null) {
      await fs.rm(target, { force: true });
    } else {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, change.content);
    }
  }
  return { sha: "local" };
}

// ---------------------------------------------------------------- Shared

async function checkExpectations(
  changes: FileChange[],
  read: (p: string) => Promise<RepoFile | null>,
) {
  for (const change of changes) {
    if (change.expectedSha === undefined) continue;
    const current = (await read(change.path))?.sha ?? null;
    if (current !== change.expectedSha) {
      throw new ConflictError(
        `${change.path} changed since you opened it. Reload to get the latest version.`,
      );
    }
  }
}

export async function readRepoFile(p: string): Promise<RepoFile | null> {
  assertReadable(p);
  return githubEnabled() ? ghRead(p) : fsRead(p);
}

export async function listRepoDir(dir: string): Promise<{ name: string; path: string; sha: string }[]> {
  assertReadable(`${dir}/x`);
  return githubEnabled() ? ghList(dir) : fsList(dir);
}

export async function commitChanges(changes: FileChange[], message: string): Promise<CommitResult> {
  if (changes.length === 0) throw new Error("Nothing to commit.");
  for (const change of changes) {
    if (!isWritablePath(change.path)) throw new Error(`Path not writable: ${change.path}`);
  }
  return githubEnabled() ? ghCommit(changes, message) : fsCommit(changes);
}

export function isLocalMode() {
  return !adminEnv.githubToken();
}

// ---------------------------------------------------------------- Activity

export type RecentCommit = {
  sha: string;
  message: string;
  date: string;
  url: string;
  /** Deployment status reported to GitHub by Vercel. */
  state: "success" | "pending" | "failure" | "error" | "unknown";
};

export async function recentCommits(limit = 6): Promise<RecentCommit[]> {
  if (isLocalMode()) return [];
  const branch = encodeURIComponent(adminEnv.githubBranch());
  const commits = await gh<
    { sha: string; html_url: string; commit: { message: string; committer: { date: string } } }[]
  >(`/commits?sha=${branch}&per_page=${limit}`);

  return Promise.all(
    (commits ?? []).map(async (item) => {
      let state: RecentCommit["state"] = "unknown";
      try {
        const status = await gh<{ state: string; total_count: number }>(`/commits/${item.sha}/status`);
        if (status && status.total_count > 0) state = status.state as RecentCommit["state"];
      } catch {
        // Status is best-effort (the token may lack the commit-status permission).
      }
      return {
        sha: item.sha,
        message: item.commit.message.split("\n")[0],
        date: item.commit.committer.date,
        url: item.html_url,
        state,
      };
    }),
  );
}
