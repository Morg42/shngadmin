import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppConfigService } from './app-config.service';
import { UserPreferencesService } from './user-preferences.service';

/**
 * Owns the app's light/dark theme state. Applies a `dark-mode` class to
 * <html>, which both PrimeNG (via `darkModeSelector: '.dark-mode'` in
 * main.ts) and this app's own --shng-* CSS variable overrides key off.
 *
 * Precedence: a saved local preference (UserPreferencesService, session-only
 * via localStorage) always wins; otherwise falls back to the server's
 * canonical default (AppConfigService.darkModeDefault, from etc/module.yaml
 * admin: dark_mode). Toggling never writes back to the server.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly userPrefs = inject(UserPreferencesService);
  private readonly appConfig = inject(AppConfigService);

  private readonly _darkMode$ = new BehaviorSubject<boolean>(this.userPrefs.darkMode ?? false);
  readonly darkMode$ = this._darkMode$.asObservable();

  constructor() {
    this.apply(this._darkMode$.getValue());
  }

  get darkMode(): boolean {
    return this._darkMode$.getValue();
  }

  /**
   * Called once the server's canonical default is known (after
   * getServerinfo() resolves). No-op if the user already has a local
   * preference — the local choice always takes precedence.
   */
  applyServerDefault(): void {
    if (this.userPrefs.darkMode === undefined) {
      this.apply(this.appConfig.darkModeDefault);
    }
  }

  toggle(): void {
    this.set(!this.darkMode);
  }

  set(darkMode: boolean): void {
    this.userPrefs.setDarkMode(darkMode);
    this.apply(darkMode);
  }

  private apply(darkMode: boolean): void {
    document.documentElement.classList.toggle('dark-mode', darkMode);
    this._darkMode$.next(darkMode);
  }
}
