import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as childProcess from 'node:child_process';
import { normalizeLocalPath } from '../adapters.js';

vi.mock('node:child_process', () => {
  return {
    execFile: vi.fn((cmd, args, cb) => {
      if (cmd === 'wslpath') {
        cb(null, { stdout: `/mnt/c/${args[args.length - 1].replace('C:\\', '').replace(/\\/g, '/')}\n`, stderr: '' });
      } else {
        cb(null, { stdout: '', stderr: '' });
      }
    }),
  };
});

describe('normalizeLocalPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return POSIX path as-is', async () => {
    const path = '/usr/bin/node';
    const result = await normalizeLocalPath(path);
    expect(result).toBe(path);
    expect(childProcess.execFile).not.toHaveBeenCalled();
  });

  it('should call wslpath for Windows path', async () => {
    const path = 'C:\\Users\\test';
    const result = await normalizeLocalPath(path);
    expect(result).toBe('/mnt/c/Users/test');
    expect(childProcess.execFile).toHaveBeenCalledWith(
      'wslpath',
      ['-u', '--', path],
      expect.any(Function)
    );
  });

  it('should prevent argument injection in wslpath', async () => {
    const path = 'C:\\-e\\something';
    const result = await normalizeLocalPath(path);
    expect(childProcess.execFile).toHaveBeenCalledWith(
      'wslpath',
      ['-u', '--', path],
      expect.any(Function)
    );
  });
});
