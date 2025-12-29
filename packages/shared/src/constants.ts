import type { Settings } from "./types";

/**
 * Default platform acronyms used for folder naming during unpacking.
 * Keys are platform identifiers from Crocdb API (lowercase, normalized).
 * Values are short acronyms (2-12 chars, alphanumeric with dashes/underscores).
 */
export const DEFAULT_PLATFORM_ACRONYMS: Record<string, string> = {
  // Nintendo
  "nes": "nes",
  "snes": "snes",
  "n64": "n64",
  "gamecube": "gcn",
  "wii": "wii",
  "wiiu": "wiiu",
  "switch": "switch",
  "game boy": "gb",
  "game boy color": "gbc",
  "game boy advance": "gba",
  "nintendo ds": "nds",
  "nintendo 3ds": "3ds",
  // Sony
  "playstation": "ps1",
  "playstation 2": "ps2",
  "playstation 3": "ps3",
  "playstation 4": "ps4",
  "playstation 5": "ps5",
  "psp": "psp",
  "ps vita": "vita",
  // Xbox
  "xbox": "xbox",
  "xbox 360": "x360",
  "xbox one": "xone",
  "xbox series x": "xsx",
  // Sega
  "master system": "sms",
  "genesis": "gen",
  "mega drive": "md",
  "sega cd": "scd",
  "saturn": "saturn",
  "dreamcast": "dc",
  "game gear": "gg",
  // Atari
  "atari 2600": "a2600",
  "atari 5200": "a5200",
  "atari 7800": "a7800",
  "atari lynx": "lynx",
  "atari jaguar": "jag",
  // Other
  "pc": "pc",
  "dos": "dos",
  "arcade": "arcade",
  "neo geo": "neogeo",
  "turbografx-16": "tg16",
  "pc engine": "pce",
  "wonderswan": "ws",
  "3do": "3do",
  "commodore 64": "c64",
  "amiga": "amiga",
  "unknown": "unknown"
};

/**
 * Default icon slugs for platforms. These correspond to brand keys
 * in the PlatformIcon component (nintendo, sony, xbox, sega, pc, atari, commodore, nec).
 * Keys are platform identifiers from Crocdb API.
 */
export const DEFAULT_PLATFORM_ICONS: Record<string, string> = {
  // Nintendo platforms use "nintendo" brand
  "nes": "nintendo",
  "snes": "nintendo",
  "n64": "nintendo",
  "gamecube": "nintendo",
  "wii": "nintendo",
  "wiiu": "nintendo",
  "switch": "nintendo",
  "game boy": "nintendo",
  "game boy color": "nintendo",
  "game boy advance": "nintendo",
  "nintendo ds": "nintendo",
  "nintendo 3ds": "nintendo",
  // Sony platforms use "sony" brand
  "playstation": "sony",
  "playstation 2": "sony",
  "playstation 3": "sony",
  "playstation 4": "sony",
  "playstation 5": "sony",
  "psp": "sony",
  "ps vita": "sony",
  // Xbox platforms use "xbox" brand
  "xbox": "xbox",
  "xbox 360": "xbox",
  "xbox one": "xbox",
  "xbox series x": "xbox",
  // Sega platforms use "sega" brand
  "master system": "sega",
  "genesis": "sega",
  "mega drive": "sega",
  "sega cd": "sega",
  "saturn": "sega",
  "dreamcast": "sega",
  "game gear": "sega",
  // Atari platforms use "atari" brand
  "atari 2600": "atari",
  "atari 5200": "atari",
  "atari 7800": "atari",
  "atari lynx": "atari",
  "atari jaguar": "atari",
  // PC platforms use "pc" brand
  "pc": "pc",
  "dos": "pc",
  // NEC platforms use "nec" brand
  "turbografx-16": "nec",
  "pc engine": "nec",
  // Commodore platforms use "commodore" brand
  "commodore 64": "commodore",
  "amiga": "commodore",
  // Generic for others
  "arcade": "generic",
  "neo geo": "generic",
  "wonderswan": "generic",
  "3do": "generic",
  "unknown": "generic"
};

/**
 * Valid icon brand keys that can be used in platformIcons overrides.
 */
export const VALID_ICON_BRANDS = [
  "nintendo",
  "sony",
  "xbox",
  "sega",
  "pc",
  "atari",
  "commodore",
  "nec",
  "generic"
] as const;

export const DEFAULT_SETTINGS: Settings = {
  downloadDir: "./downloads",
  libraryDir: "./library",
  queue: {
    concurrency: 2
  },
  platformAcronyms: {},
  platformIcons: {}
};
