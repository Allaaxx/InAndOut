import { resolveSocketTarget } from '@client/hooks/useSocket';
import { describe, expect, it } from 'vitest';

describe('resolveSocketTarget', () => {
  it('keeps the default socket.io path for an absolute API URL', () => {
    expect(resolveSocketTarget('http://localhost:3000')).toEqual({
      origin: 'http://localhost:3000',
      path: '/socket.io',
    });
  });

  it('moves a prefixed API path into the transport path', () => {
    expect(resolveSocketTarget('https://escola.example/api/')).toEqual({
      origin: 'https://escola.example',
      path: '/api/socket.io',
    });
  });

  it('resolves a relative API URL against the current origin', () => {
    const target = resolveSocketTarget('/api');
    expect(target.origin).toBe(globalThis.location.origin);
    expect(target.path).toBe('/api/socket.io');
  });
});
