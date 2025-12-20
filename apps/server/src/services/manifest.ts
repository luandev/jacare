import path from "path";
import { promises as fs } from "fs";
import type { Manifest } from "@crocdesk/shared";

export async function writeManifest(
  targetDir: string,
  manifest: Manifest
): Promise<void> {
  const manifestPath = path.join(targetDir, ".crocdesk.json");
  const payload = JSON.stringify(manifest, null, 2);
  await fs.writeFile(manifestPath, payload, "utf-8");
}
