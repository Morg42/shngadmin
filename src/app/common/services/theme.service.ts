import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppConfigService } from './app-config.service';
import { ThemePreference, UserPreferencesService } from './user-preferences.service';

/**
 * Owns the app's light/dark theme state. Applies a `dark-mode` class to
 * <html>, which both PrimeNG (via `darkModeSelector: '.dark-mode'` in
 * main.ts) and this app's own --shng-* CSS variable overrides key off.
 *
 * Precedence: an explicit local choice (UserPreferencesService, session-only
 * via localStorage) always wins; 'system' follows the OS's
 * prefers-color-scheme live (reacts to OS changes while the tab is open,
 * no reload needed); if this browser doesn't support prefers-color-scheme
 * at all, 'system' falls back to the server's canonical default
 * (AppConfigService.darkModeDefault, from etc/module.yaml admin: dark_mode).
 * Choosing a theme never writes back to the server.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly userPrefs = inject(UserPreferencesService);
  private readonly appConfig = inject(AppConfigService);
  private readonly osQuery =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : undefined;

  private readonly _preference$ = new BehaviorSubject<ThemePreference>(
    this.userPrefs.themePreference ?? 'system',
  );
  readonly preference$ = this._preference$.asObservable();

  private readonly _darkMode$ = new BehaviorSubject<boolean>(false);
  readonly darkMode$ = this._darkMode$.asObservable();

  constructor() {
    this.recompute();
    this.osQuery?.addEventListener('change', () => this.recompute());
  }

  get preference(): ThemePreference {
    return this._preference$.getValue();
  }

  get darkMode(): boolean {
    return this._darkMode$.getValue();
  }

  /**
   * Called once the server's canonical default is known (after
   * getServerinfo() resolves). Only actually changes anything while in
   * 'system' mode on a browser that has no prefers-color-scheme support at
   * all — the one case where the server default is still consulted.
   */
  applyServerDefault(): void {
    this.recompute();
  }

  setPreference(preference: ThemePreference): void {
    this.userPrefs.setThemePreference(preference);
    this._preference$.next(preference);
    this.recompute();
  }

  /** Cycles Light -> Dark -> System -> Light, for the compact mobile control
   * that has no room for the full three-option picker. */
  cycle(): void {
    const order: ThemePreference[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(this.preference) + 1) % order.length];
    this.setPreference(next);
  }

  private recompute(): void {
    const darkMode = this.resolveDarkMode();
    document.documentElement.classList.toggle('dark-mode', darkMode);
    this._darkMode$.next(darkMode);
  }

  private resolveDarkMode(): boolean {
    const preference = this.preference;
    if (preference === 'dark') return true;
    if (preference === 'light') return false;
    return this.osQuery ? this.osQuery.matches : this.appConfig.darkModeDefault;
  }
}
