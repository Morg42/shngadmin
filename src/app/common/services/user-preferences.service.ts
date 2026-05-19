import { Injectable } from '@angular/core';

export interface UserPreferences {
  /** ISO 639-1 language code chosen by the user (e.g. 'de', 'en', 'fr'). */
  language?: string;
  /**
   * Last language reported by the server (cached so the next page load can
   * use it immediately in the constructor, before the server responds).
   * Never written by the user — overwritten by every successful server response.
   */
  cachedServerLanguage?: string;
  /** Reserved for a future dark-mode toggle. */
  darkMode?: boolean;
}

/**
 * Persists user-controllable UI preferences to localStorage so they survive
 * page reloads.  All other runtime configuration (host IP, WebSocket port,
 * server-assigned language, …) lives in AppConfigService and is never
 * written here.
 *
 * Storage key: 'shngadmin_prefs'  (single JSON object)
 */
@Injectable({
  providedIn: 'root',
})
export class UserPreferencesService {
  private static readonly STORAGE_KEY = 'shngadmin_prefs';
  private prefs: UserPreferences = {};

  constructor() {
    try {
      const raw = localStorage.getItem(UserPreferencesService.STORAGE_KEY);
      if (raw) {
        this.prefs = JSON.parse(raw) as UserPreferences;
      }
    } catch {
      // Corrupt or unreadable entry — start from a clean slate.
      localStorage.removeItem(UserPreferencesService.STORAGE_KEY);
    }
  }

  // ----------------------------------------------------------------
  // Reads
  // ----------------------------------------------------------------

  /** Saved language preference, or undefined if never set by the user. */
  get language(): string | undefined {
    return this.prefs.language;
  }

  /** Last language the server reported, or undefined if never loaded. */
  get cachedServerLanguage(): string | undefined {
    return this.prefs.cachedServerLanguage;
  }

  // ----------------------------------------------------------------
  // Writes
  // ----------------------------------------------------------------

  setLanguage(lang: string): void {
    this.prefs = { ...this.prefs, language: lang };
    this.persist();
  }

  /** Called after a successful server response to persist the server's preferred language. */
  cacheServerLanguage(lang: string): void {
    this.prefs = { ...this.prefs, cachedServerLanguage: lang };
    this.persist();
  }

  /** Wipe all saved preferences (e.g. on logout or factory-reset). */
  clear(): void {
    this.prefs = {};
    localStorage.removeItem(UserPreferencesService.STORAGE_KEY);
  }

  // ----------------------------------------------------------------
  // Private
  // ----------------------------------------------------------------

  private persist(): void {
    localStorage.setItem(UserPreferencesService.STORAGE_KEY, JSON.stringify(this.prefs));
  }
}
