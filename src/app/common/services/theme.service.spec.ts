import { TestBed } from '@angular/core/testing';
import { AppConfigService } from './app-config.service';
import { ThemeService } from './theme.service';
import { UserPreferencesService } from './user-preferences.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let userPrefs: UserPreferencesService;
  let appConfig: AppConfigService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-mode');
    TestBed.configureTestingModule({});
    userPrefs = TestBed.inject(UserPreferencesService);
    appConfig = TestBed.inject(AppConfigService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-mode');
  });

  it('defaults to light mode with no saved preference', () => {
    service = TestBed.inject(ThemeService);
    expect(service.darkMode).toBe(false);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
  });

  it('applies a saved local preference immediately on construction', () => {
    userPrefs.setDarkMode(true);
    service = TestBed.inject(ThemeService);
    expect(service.darkMode).toBe(true);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
  });

  it('applyServerDefault adopts the server default when no local preference exists', () => {
    service = TestBed.inject(ThemeService);
    appConfig.patch({ darkModeDefault: true });
    service.applyServerDefault();
    expect(service.darkMode).toBe(true);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
  });

  it('applyServerDefault does not override an existing local preference', () => {
    userPrefs.setDarkMode(false);
    service = TestBed.inject(ThemeService);
    appConfig.patch({ darkModeDefault: true });
    service.applyServerDefault();
    expect(service.darkMode).toBe(false);
  });

  it('toggle flips the state, persists it, and updates the DOM class', () => {
    service = TestBed.inject(ThemeService);
    service.toggle();
    expect(service.darkMode).toBe(true);
    expect(userPrefs.darkMode).toBe(true);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);

    service.toggle();
    expect(service.darkMode).toBe(false);
    expect(userPrefs.darkMode).toBe(false);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
  });

  it('darkMode$ emits on every change', () => {
    service = TestBed.inject(ThemeService);
    const seen: boolean[] = [];
    service.darkMode$.subscribe((v) => seen.push(v));
    service.toggle();
    service.set(false);
    expect(seen).toEqual([false, true, false]);
  });
});
