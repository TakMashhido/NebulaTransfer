import { describe, expect, it } from 'vitest';
import { friendlyName, generatePeerId, parsePeerInput, peerColor, shortId } from './identity';

describe('identity', () => {
  it('generates short readable ids', () => {
    const id = generatePeerId();
    expect(id).toMatch(/^nebula-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(shortId(id)).toHaveLength(9);
  });
  it('parses typed ids, full ids and share links', () => {
    expect(parsePeerInput(' K3X9-QP7M ')).toBe('nebula-k3x9-qp7m');
    expect(parsePeerInput('nebula-k3x9-qp7m')).toBe('nebula-k3x9-qp7m');
    expect(parsePeerInput('https://takmashhido.github.io/NebulaTransfer/?connect=nebula-k3x9-qp7m')).toBe('nebula-k3x9-qp7m');
    expect(parsePeerInput('3f2b1c9e-1d2a-4b7c-9e8f-0a1b2c3d4e5f')).toBe('3f2b1c9e-1d2a-4b7c-9e8f-0a1b2c3d4e5f');
    expect(parsePeerInput('')).toBeNull();
    expect(parsePeerInput('hello world!')).toBeNull();
  });
  it('derives stable names and colours', () => {
    expect(friendlyName('nebula-aaaa-bbbb')).toBe(friendlyName('nebula-aaaa-bbbb'));
    expect(friendlyName('nebula-aaaa-bbbb')).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    expect(peerColor('x')).toBe(peerColor('x'));
  });
});
