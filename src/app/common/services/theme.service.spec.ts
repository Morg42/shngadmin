import { TestBed } from '@angular/core/testing';
import { AppConfigService } from './app-config.service';
import { ThemeService } from './theme.service';
import { UserPreferencesService } from './user-preferences.service';

/** A fake MediaQueryList whose `matches` can be flipped and whose 'change'
 * listener can be triggered manually, standing in for the OS's live
 * prefers-color-scheme signal. */
function fakeMediaQueryList(initialMatches: boolean) {
  let changeHandler: (() => void) | undefined;
  return {
    matches: initialMatches,
    addEventListener: (_event: string, handler: () => void) => {
      changeHandler = handler;
    },
    removeEventListener: () => {},
    fireChange(newMatches: boolean) {
      this.matches = newMatches;
      changeHandler?.();
    },
  };
}

describe('ThemeService', () => {
  let service: ThemeService;
  let userPrefs: UserPreferencesService;
  let appConfig: AppConfigService;
  let mql: ReturnType<typeof fakeMediaQueryList>;
  const originalMatchMedia = window.matchMedia;

  function setup(
    osMatchesDark: boolean,
    {
      matchMediaSupported = true,
      savedPreference,
    }: { matchMediaSupported?: boolean; savedPreference?: 'light' | 'dark' | 'system' } = {},
  ) {
    mql = fakeMediaQueryList(osMatchesDark);
    if (matchMediaSupported) {
      jest.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);
    } else {
      Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true });
    }
    TestBed.configureTestingModule({});
    userPrefs = TestBed.inject(UserPreferencesService);
    appConfig = TestBed.inject(AppConfigService);
    if (savedPreference) {
      userPrefs.setThemePreference(savedPreference);
    }
    service = TestBed.inject(ThemeService);
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-mode');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-mode');
    jest.restoreAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      value: originalMatchMedia,
      writable: true,
      configurable: true,
    });
  });

  it('defaults to system preference, following a light OS, with no saved choice', () => {
    setup(false);
    expect(service.preference).toBe('system');
    expect(service.darkMode).toBe(false);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
  });

  it('defaults to system preference, following a dark OS, with no saved choice', () => {
    setup(true);
    expect(service.preference).toBe('system');
    expect(service.darkMode).toBe(true);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
  });

  it('an explicit saved preference overrides the OS setting', () => {
    setup(true, { savedPreference: 'light' });
    expect(service.preference).toBe('light');
    expect(service.darkMode).toBe(false);
  });

  it('reacts live to an OS preference change while in system mode', () => {
    setup(false);
    expect(service.darkMode).toBe(false);
    mql.fireChange(true);
    expect(service.darkMode).toBe(true);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
  });

  it('does not react to OS changes once an explicit preference is set', () => {
    setup(false);
    service.setPreference('light');
    mql.fireChange(true);
    expect(service.darkMode).toBe(false);
  });

  it('falls back to the server default only when matchMedia is unsupported', () => {
    setup(false, { matchMediaSupported: false });
    expect(service.darkMode).toBe(false);
    appConfig.patch({ darkModeDefault: true });
    service.applyServerDefault();
    expect(service.darkMode).toBe(true);
  });

  it('setPreference persists the choice and updates the DOM class', () => {
    setup(false);
    service.setPreference('dark');
    expect(service.preference).toBe('dark');
    expect(service.darkMode).toBe(true);
    expect(userPrefs.themePreference).toBe('dark');
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);

    service.setPreference('light');
    expect(service.darkMode).toBe(false);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
  });

  it('cycle() rotates light -> dark -> system -> light', () => {
    setup(false);
    service.setPreference('light');
    service.cycle();
    expect(service.preference).toBe('dark');
    service.cycle();
    expect(service.preference).toBe('system');
    service.cycle();
    expect(service.preference).toBe('light');
  });

  it('darkMode$ emits on every effective change', () => {
    setup(false);
    const seen: boolean[] = [];
    service.darkMode$.subscribe((v) => seen.push(v));
    service.setPreference('dark');
    service.setPreference('light');
    expect(seen).toEqual([false, true, false]);
  });
});
