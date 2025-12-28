import { DEFAULT_PLATFORM_ACRONYMS, DEFAULT_PLATFORM_ICONS, VALID_ICON_BRANDS } from "./constants";
import type { Settings } from "./types";

/**
 * Validates a platform acronym format.
 * Must be 2-12 characters, alphanumeric with dashes and underscores allowed.
 */
export function isValidAcronym(acronym: string): boolean {
  return /^[a-z0-9_-]{2,12}$/i.test(acronym);
}

/**
 * Validates an icon brand slug.
 * Must be one of the predefined valid icon brands.
 */
export function isValidIconBrand(brand: string): boolean {
  return VALID_ICON_BRANDS.includes(brand as typeof VALID_ICON_BRANDS[number]);
}

/**
 * Resolves the effective platform acronym for a given platform.
 * Checks user overrides first, then falls back to defaults.
 * Normalizes the platform key to lowercase for consistent lookups.
 */
export function resolvePlatformAcronym(
  platform: string,
  settings?: Settings
): string {
  const normalizedPlatform = platform.toLowerCase().trim();
  
  // Check user overrides
  const customAcronym = settings?.platformAcronyms?.[normalizedPlatform];
  if (customAcronym && isValidAcronym(customAcronym)) {
    return customAcronym;
  }
  
  // Fallback to defaults
  const defaultAcronym = DEFAULT_PLATFORM_ACRONYMS[normalizedPlatform];
  if (defaultAcronym) {
    return defaultAcronym;
  }
  
  // Last resort: use the platform name itself (sanitized)
  return sanitizePlatformForFolder(normalizedPlatform);
}

/**
 * Resolves the effective icon brand for a given platform.
 * Checks user overrides first, then falls back to defaults.
 * Normalizes the platform key to lowercase for consistent lookups.
 */
export function resolvePlatformIcon(
  platform: string,
  settings?: Settings
): string {
  const normalizedPlatform = platform.toLowerCase().trim();
  
  // Check user overrides
  const customIcon = settings?.platformIcons?.[normalizedPlatform];
  if (customIcon && isValidIconBrand(customIcon)) {
    return customIcon;
  }
  
  // Fallback to defaults
  const defaultIcon = DEFAULT_PLATFORM_ICONS[normalizedPlatform];
  if (defaultIcon) {
    return defaultIcon;
  }
  
  // Last resort: generic
  return "generic";
}

/**
 * Sanitizes a platform name to be safe for use as a folder name.
 * Removes special characters and limits length.
 */
function sanitizePlatformForFolder(platform: string): string {
  return platform
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 12);
}
