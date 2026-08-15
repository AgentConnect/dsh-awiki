import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { AwikiImStateStore } from '../src/im/storage.js';

describe('AWiki IM state store', () => {
  test('clears only the configured state file and resets the in-memory snapshot', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'awiki-im-store-'));
    const statePath = join(directory, 'state.json');
    const siblingPath = join(directory, 'keep.txt');
    const store = new AwikiImStateStore(statePath);

    await store.load();
    await store.mutate((state) => {
      state.registrationOtp = {
        handle: 'alice.awiki.test',
        phone: '+8613800138000',
        retryAt: '2026-08-14T00:01:00Z',
      };
    });
    await writeFile(siblingPath, 'preserve me', 'utf8');

    await expect(store.clear()).resolves.toBe(true);
    await expect(stat(statePath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(siblingPath, 'utf8')).resolves.toBe('preserve me');
    expect(store.snapshot()).toEqual({
      version: 2,
      conversations: {},
      attachments: {},
      sendOperations: {},
    });
    await expect(store.clear()).resolves.toBe(false);
  });
});
