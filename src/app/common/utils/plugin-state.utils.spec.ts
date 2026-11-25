import { removalState, removalStateLabelKey, removalStateTextKey } from './plugin-state.utils';

describe('plugin-state.utils', () => {
  it('removalState() recognises deprecated and defunct case-insensitively', () => {
    expect(removalState('deprecated')).toBe('deprecated');
    expect(removalState('Defunct')).toBe('defunct');
  });

  it('removalState() returns null for other states and missing values', () => {
    expect(removalState('ready')).toBeNull();
    expect(removalState('develop')).toBeNull();
    expect(removalState('')).toBeNull();
    expect(removalState(undefined)).toBeNull();
    expect(removalState(null)).toBeNull();
  });

  it('builds the translation keys', () => {
    expect(removalStateLabelKey('defunct')).toBe('PLUGIN.DEFUNCT');
    expect(removalStateTextKey('deprecated')).toBe('PLUGIN.DEPRECATED_TEXT');
  });
});
