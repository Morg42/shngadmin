import { TestBed } from '@angular/core/testing';
import { UserPreferencesService } from './user-preferences.service';

const STORAGE_KEY = 'shngadmin_prefs';

describe('UserPreferencesService (empty storage)', () => {
  let service: UserPreferencesService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [UserPreferencesService] });
    service = TestBed.inject(UserPreferencesService);
  });

  afterEach(() => localStorage.clear());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('language is undefined when nothing is stored', () => {
    expect(service.language).toBeUndefined();
  });

  it('setLanguage persists the language to localStorage', () => {
    service.setLanguage('de');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.language).toBe('de');
  });

  it('language getter returns the previously set language', () => {
    service.setLanguage('fr');
    expect(service.language).toBe('fr');
  });

  it('setLanguage overwrites a previously set language', () => {
    service.setLanguage('de');
    service.setLanguage('en');
    expect(service.language).toBe('en');
  });

  it('clear removes the stored preferences', () => {
    service.setLanguage('de');
    service.clear();
    expect(service.language).toBeUndefined();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('themePreference is undefined when nothing is stored', () => {
    expect(service.themePreference).toBeUndefined();
  });

  it('setThemePreference persists the preference to localStorage', () => {
    service.setThemePreference('dark');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.themePreference).toBe('dark');
    expect(service.themePreference).toBe('dark');
  });

  it('setThemePreference(light) is distinguishable from never having set it', () => {
    service.setThemePreference('light');
    expect(service.themePreference).toBe('light');
  });

  it('setThemePreference accepts system', () => {
    service.setThemePreference('system');
    expect(service.themePreference).toBe('system');
  });
});

describe('UserPreferencesService (legacy darkMode storage)', () => {
  let service: UserPreferencesService;

  afterEach(() => localStorage.clear());

  it('migrates a legacy darkMode:true to themePreference:dark', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ darkMode: true }));
    TestBed.configureTestingModule({ providers: [UserPreferencesService] });
    service = TestBed.inject(UserPreferencesService);
    expect(service.themePreference).toBe('dark');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.darkMode).toBeUndefined();
  });

  it('migrates a legacy darkMode:false to themePreference:light', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ darkMode: false }));
    TestBed.configureTestingModule({ providers: [UserPreferencesService] });
    service = TestBed.inject(UserPreferencesService);
    expect(service.themePreference).toBe('light');
  });
});

describe('UserPreferencesService (pre-existing storage)', () => {
  let service: UserPreferencesService;

  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ language: 'de' }));
    TestBed.configureTestingModule({ providers: [UserPreferencesService] });
    service = TestBed.inject(UserPreferencesService);
  });

  afterEach(() => localStorage.clear());

  it('loads language from localStorage on construction', () => {
    expect(service.language).toBe('de');
  });
});

describe('UserPreferencesService (corrupt storage)', () => {
  let service: UserPreferencesService;

  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json}}}');
    TestBed.configureTestingModule({ providers: [UserPreferencesService] });
    service = TestBed.inject(UserPreferencesService);
  });

  afterEach(() => localStorage.clear());

  it('handles corrupt localStorage entry gracefully', () => {
    expect(service.language).toBeUndefined();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
