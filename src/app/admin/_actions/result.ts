import { ConflictError } from "@/lib/admin/repo";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; problems?: string[] };

/** Runs an admin action and turns thrown errors into a message the UI can show. */
export async function run<T extends object>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { ok: false, error: "Your session expired. Sign in again in a new tab, then retry." };
    }
    if (error instanceof ConflictError) return { ok: false, error: error.message };
    console.error("[admin] action failed", error);
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}
