import type { Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

const baseDir = path.resolve('test-results', 'screenshots');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function captureOnCI(page: Page, name: string) {
  if (!process.env.SCREENSHOT_ARTIFACTS && !process.env.CI) return;
  await ensureDir(baseDir);
  const sanitizedName = name.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'screenshot';
  const file = path.join(baseDir, `${sanitizedName}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}
