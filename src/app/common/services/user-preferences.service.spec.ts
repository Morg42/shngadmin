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
