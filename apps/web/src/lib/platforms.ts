import type { CrocdbPlatformsResponseData, Settings } from "@crocdesk/shared";

export function getPlatformLabel(
  platform: string,
  options?: { settings?: Settings | null; platformsData?: CrocdbPlatformsResponseData }
): string {
  const trimmed = options?.settings?.platformShortNames?.[platform]?.trim();
  if (trimmed) return trimmed;

  const platformName = options?.platformsData?.platforms?.[platform]?.name;
  if (platformName) return platformName;

  return platform.toUpperCase();
}
