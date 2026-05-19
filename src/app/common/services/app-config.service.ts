import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { UserPreferencesService } from './user-preferences.service';

/**
 * Typed configuration that was previously scattered across sessionStorage.
 * All values have safe defaults so callers never receive null.
 */
export interface AppConfig {
  // Auth — null until /api/server/ responds
  loginRequired: boolean | null;

  // Connection
  apiUrl: string;
  dataUrl: string;
  hostIp: string;
  wsHost: string;
  wsPort: string;

  // Server info (populated after /api/server/info loads)
  clientIp: string;
  tz: string;
  tzname: string;
  tznameST: string;
  tznameDST: string;
  coreBranch: string;
  pluginsBranch: string;
  itemtreeFullpath: boolean;
  itemtreeSearchstart: number;
  developerMode: boolean;
  clickDropdownHeader: boolean;
  fallbackLanguageOrder: string[];

  // Language (may be updated by the user at runtime)
  defaultLanguage: string;
}

const DEFAULT_CONFIG: AppConfig = {
  loginRequired: null,
  apiUrl: '',
  dataUrl: '',
  hostIp: '',
  wsHost: '',
  wsPort: '',
  clientIp: '',
  tz: '',
  tzname: '',
  tznameST: '',
  tznameDST: '',
  coreBranch: '',
  pluginsBranch: '',
  itemtreeFullpath: true,
  itemtreeSearchstart: 3,
  developerMode: false,
  clickDropdownHeader: true,
  fallbackLanguageOrder: ['en', 'de'],
  defaultLanguage: 'en',
};

@Injectable({
  providedIn: 'root',
})
export class AppConfigService {
  private readonly userPrefs = inject(UserPreferencesService);

  /**
   * Seed defaultLanguage from the saved user preference so the correct
   * language is active before the first server response arrives.
   */
  private _config$ = new BehaviorSubject<AppConfig>({
    ...DEFAULT_CONFIG,
    defaultLanguage:
      this.userPrefs.language ??
      this.userPrefs.cachedServerLanguage ??
      DEFAULT_CONFIG.defaultLanguage,
  });

  // ----------------------------------------------------------------
  // Snapshot access — use when you just need a current value
  // ----------------------------------------------------------------

  get snapshot(): Readonly<AppConfig> {
    return this._config$.getValue();
  }

  // ----------------------------------------------------------------
  // Reactive access — use in components that need to react to changes
  // ----------------------------------------------------------------

  get config$(): Observable<AppConfig> {
    return this._config$.asObservable();
  }

  /**
   * Emits once as soon as apiUrl is set (ServerApiService constructor ran).
   * Callers can await this before making their first HTTP call.
   */
  get ready$(): Observable<AppConfig> {
    return this._config$.pipe(filter((cfg) => cfg.apiUrl !== ''));
  }

  /**
   * Emits once after the first /api/server response has patched wsPort.
   * Use in route guards to delay navigation until full server config is known.
   */
  get serverReady$(): Observable<AppConfig> {
    return this._config$.pipe(filter((cfg) => cfg.wsPort !== ''));
  }

  /**
   * Emits once after getServerBasicinfo() has patched loginRequired, making
   * it safe for the auth guard to decide whether to allow or redirect.
   */
  get authReady$(): Observable<boolean> {
    return this._config$.pipe(
      filter((cfg) => cfg.loginRequired !== null),
      map((cfg) => cfg.loginRequired as boolean),
    );
  }

  // ----------------------------------------------------------------
  // Typed getters for the most-used individual values
  // ----------------------------------------------------------------

  get apiUrl(): string {
    return this.snapshot.apiUrl;
  }
  get hostIp(): string {
    return this.snapshot.hostIp;
  }
  get wsHost(): string {
    return this.snapshot.wsHost;
  }
  get wsPort(): string {
    return this.snapshot.wsPort;
  }
  get defaultLanguage(): string {
    return this.snapshot.defaultLanguage;
  }
  get developerMode(): boolean {
    return this.snapshot.developerMode;
  }
  get clickDropdownHeader(): boolean {
    return this.snapshot.clickDropdownHeader;
  }
  get itemtreeSearchstart(): number {
    return this.snapshot.itemtreeSearchstart;
  }
  get itemtreeFullpath(): boolean {
    return this.snapshot.itemtreeFullpath;
  }
  get fallbackLanguageOrder(): string[] {
    return this.snapshot.fallbackLanguageOrder;
  }
  get tzname(): string {
    return this.snapshot.tzname;
  }
  get tznameDST(): string {
    return this.snapshot.tznameDST;
  }

  // ----------------------------------------------------------------
  // Mutation
  // ----------------------------------------------------------------

  /**
   * Merge a partial config update; only listed keys are changed.
   */
  patch(partial: Partial<AppConfig>): void {
    this._config$.next({ ...this._config$.getValue(), ...partial });
  }

  /**
   * Convenience setter for defaultLanguage (changed at runtime by the user).
   */
  setDefaultLanguage(lang: string): void {
    this.patch({ defaultLanguage: lang });
  }
}
