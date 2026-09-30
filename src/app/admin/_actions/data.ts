"use server";

import { run } from "@/app/admin/_actions/result";
import { blobSha, commitChanges } from "@/lib/admin/repo";
import { getDataSection, validateSection } from "@/lib/admin/schemas";
import { assertAdmin } from "@/lib/admin/session";

export async function saveDataAction(key: string, value: unknown, expectedSha: string) {
  return run(async () => {
    await assertAdmin();
    const section = getDataSection(key);
    if (!section) throw new Error("Unknown section.");
    if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error("Missing version; reload the page.");

    const { cleaned, problems } = validateSection(section, value);
    if (problems.length) {
      return { saved: false, problems, commitUrl: null, sha: expectedSha };
    }

    const content = `${JSON.stringify(cleaned, null, 2)}\n`;
    const result = await commitChanges(
      [{ path: section.file, content, expectedSha }],
      `content: update ${section.title.toLowerCase()}`,
    );
    console.info(`[admin] updated ${section.file}`);
    return { saved: true, problems: [], commitUrl: result.url ?? null, sha: blobSha(Buffer.from(content)) };
  });
}
