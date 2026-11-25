import { resolveStartRoute } from './app.routes';

describe('resolveStartRoute', () => {
  it('returns the configured value when it matches a known top-level route', () => {
    expect(resolveStartRoute('dashboard')).toBe('dashboard');
    expect(resolveStartRoute('items')).toBe('items');
    expect(resolveStartRoute('plugins')).toBe('plugins');
  });

  it('falls back to dashboard for an unrecognized value', () => {
    expect(resolveStartRoute('not_a_real_route')).toBe('dashboard');
  });

  it('falls back to dashboard for an empty string', () => {
    expect(resolveStartRoute('')).toBe('dashboard');
  });
});
