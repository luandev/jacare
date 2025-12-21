import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { ensureDir, moveFile } from '../utils/fs';

async function createTempDir(prefix: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
  return dir;
}

describe('fs utils', () => {
  it('ensureDir creates nested directory', async () => {
    const base = await createTempDir('crocdesk-test');
    const nested = path.join(base, 'a', 'b', 'c');
    await ensureDir(nested);
    const stat = await fs.stat(nested);
    expect(stat.isDirectory()).toBe(true);
  });

  it('moveFile moves file to destination (rename/copy fallback)', async () => {
    const base = await createTempDir('crocdesk-test');
    const srcDir = path.join(base, 'src');
    const dstDir = path.join(base, 'dst');
    await ensureDir(srcDir);
    await ensureDir(dstDir);

    const srcFile = path.join(srcDir, 'file.txt');
    const dstFile = path.join(dstDir, 'moved.txt');
    await fs.writeFile(srcFile, 'hello');

    await moveFile(srcFile, dstFile);

    const existsDst = await fs.stat(dstFile).then(() => true).catch(() => false);
    expect(existsDst).toBe(true);
    const srcFileRemoved = await fs.stat(srcFile).then(() => false).catch(() => true);
    expect(srcFileRemoved).toBe(true);

    const content = await fs.readFile(dstFile, 'utf-8');
    expect(content).toBe('hello');
  });
});