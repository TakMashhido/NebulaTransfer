import { describe, expect, it } from 'vitest';
import { fileExtension, formatBytes, formatDuration, formatPin, formatSpeed } from './format';

describe('format', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 ** 3)).toBe('1 GB');
    expect(formatBytes(NaN)).toBe('0 B');
  });
  it('formats speed and durations', () => {
    expect(formatSpeed(0)).toBe('—');
    expect(formatSpeed(2 * 1024 * 1024)).toBe('2 MB/s');
    expect(formatDuration(0.2)).toBe('< 1s');
    expect(formatDuration(75)).toBe('1m 15s');
    expect(formatDuration(3700)).toBe('1h 1m');
    expect(formatDuration(Infinity)).toBe('—');
  });
  it('formats pins and extensions', () => {
    expect(formatPin('482913')).toBe('482 913');
    expect(fileExtension('photo.JPG')).toBe('jpg');
    expect(fileExtension('.bashrc')).toBe('');
    expect(fileExtension('README')).toBe('');
  });
});
