import { formatVersionDetail } from './version.utils';

describe('formatVersionDetail', () => {
  it('appends commit and branch as semver build metadata, like the core does', () => {
    expect(formatVersionDetail('2.0.0-dev.1', 'b3045c4', 'develop')).toBe(
      'v2.0.0-dev.1+b3045c4.develop',
    );
  });

  it('replaces characters that are not allowed in build metadata', () => {
    expect(formatVersionDetail('2.0.0', 'b3045c4', 'feature/semver_x')).toBe(
      'v2.0.0+b3045c4.feature-semver-x',
    );
  });

  it('skips empty build parts', () => {
    expect(formatVersionDetail('2.0.0', 'unknown', '')).toBe('v2.0.0+unknown');
    expect(formatVersionDetail('2.0.0', '', '')).toBe('v2.0.0');
  });
});
