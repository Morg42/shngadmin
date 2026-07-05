import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { TranslateService } from '@ngx-translate/core';
import { ServerInfo } from '../models/server-info';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';
import { SharedService } from './shared.service';
import { UserPreferencesService } from './user-preferences.service';

@Injectable({
  providedIn: 'root',
})
export class ServerApiService {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  private shared = inject(SharedService);
  private appConfig = inject(AppConfigService);
  private userPrefs = inject(UserPreferencesService);
  private readonly log = inject(LogService);

  private baseUrl = inject<string>('BASE_URL' as unknown as InjectionToken<string>);

  shng_serverinfo: ServerInfo = <ServerInfo>{ itemtree_fullpath: true };

  constructor() {
    const hostIp = new URL(this.baseUrl).hostname;
    const apiUrl = '/api/';

    this.appConfig.patch({
      apiUrl,
      dataUrl: this.baseUrl,
      hostIp,
    });
  }

  /**
   * Checks whether index.html has changed on the server since the last page
   * load and forces a full reload if so.
   *
   * Angular hashes all bundle filenames, so the only file at a stable URL is
   * index.html itself.  If the browser caches that, it keeps referencing the
   * old hashed bundles and never picks up a new deployment.
   *
   * Strategy: HEAD /index.html with cache:no-store (always hits the server),
   * compare the ETag / Last-Modified fingerprint to the value stored in
   * localStorage from the previous load.  If they differ, a new build was
   * deployed → reload so the user gets the correct frontend automatically,
   * without having to clear their cache.
   *
   * Called as a parallel APP_INITIALIZER alongside getServerBasicinfo(), so
   * any stale frontend is replaced before the user starts interacting.
   */
  async checkForUpdate(): Promise<void> {
    const STORAGE_KEY = 'shng.index_fingerprint';
    try {
      // Use document.baseURI so the URL is correct in both the dev server
      // (base href '/') and production (base href e.g. '/admin/').
      // A hardcoded '/index.html' would be root-relative and return 404 on
      // any deployment where the app is mounted under a sub-path.
      const indexUrl = new URL('index.html', document.baseURI).toString();
      const resp = await fetch(indexUrl, { method: 'HEAD', cache: 'no-store' });
      const fingerprint = resp.headers.get('etag') || resp.headers.get('last-modified');
      if (!fingerprint) return;
      const stored = localStorage.getItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, fingerprint);
      if (stored && stored !== fingerprint) {
        // Backend was updated since the last load — navigate to a cache-busting
        // URL so the browser performs an unconditional GET for index.html rather
        // than a conditional one that might still be served from disk cache.
        // AppComponent strips the _cb param from the URL after the new app loads.
        const url = new URL(window.location.href);
        url.searchParams.set('_cb', Date.now().toString());
        window.location.replace(url.toString());
      }
    } catch {
      // Network error or missing headers — skip silently; not critical.
    }
  }

  getServerBasicinfo() {
    const url = this.appConfig.apiUrl + 'server/';
    this.log.log('ServerApiService.getServerBasicinfo() using url', url);
    return this.http.get(url).pipe(
      tap((response) => this.log.log('getServerBasicinfo response:', response)),
      map((response) => {
        this.shng_serverinfo = response as ServerInfo;
        const result = response as ServerInfo;

        // Only apply the server's language if the user has no saved preference.
        // Guard against the basic /api/server/ endpoint not including default_language.
        if (!this.userPrefs.language && result.default_language) {
          this.appConfig.patch({ defaultLanguage: result.default_language });
          this.userPrefs.cacheServerLanguage(result.default_language);
          this.translate.setDefaultLang(this.shared.getFallbackLanguage());
          this.shared.setGuiLanguage();
        }

        // websocket_port is available here too — patch it now so appReadyGuard
        // (which waits for wsPort) can resolve from this call without waiting
        // for the separate getServerinfo() call from TopNavigationComponent.
        this.appConfig.patch({
          clientIp: result.client_ip,
          wsHost: this._resolveWsHost(result.websocket_host),
          wsPort: result.websocket_port ?? '',
          loginRequired: result.login_required ?? false,
        });

        this.shared.setGuiLanguage();
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ServerApiService.getServerBasicinfo(): Could not read serverinfo data - ',
          err?.error?.error || err.message || err,
        );
        return of({} as ServerInfo);
      }),
    );
  }

  getServerinfo() {
    this.log.log('ServerApiService.getServerinfo() called');
    const url = this.appConfig.apiUrl + 'server/info';
    this.log.log('ServerApiService.getServerinfo() using url', url);
    return this.http.get(url).pipe(
      tap((response) => this.log.log('ServerApiService.getServerinfo() response:', response)),
      map((response) => {
        this.shng_serverinfo = <ServerInfo>response;
        const result = response;

        const fallbackOrder = this.shng_serverinfo.fallback_language_order?.split(',') ?? [
          'en',
          'de',
        ];

        this.appConfig.patch({
          clientIp: this.shng_serverinfo.client_ip,
          tz: this.shng_serverinfo.tz,
          tzname: this.shng_serverinfo.tzname,
          tznameST: this.shng_serverinfo.tznameST,
          tznameDST: this.shng_serverinfo.tznameDST,
          itemtreeFullpath: this.shng_serverinfo.itemtree_fullpath,
          itemtreeSearchstart: this.shng_serverinfo.itemtree_searchstart,
          coreBranch: this.shng_serverinfo.core_branch,
          pluginsBranch: this.shng_serverinfo.plugins_branch,
          developerMode: this.shng_serverinfo.developer_mode,
          clickDropdownHeader: this.shng_serverinfo.click_dropdown_header,
          helpLocalAvailable: this.shng_serverinfo.help_local_available,
          darkModeDefault: this.shng_serverinfo.dark_mode,
          fallbackLanguageOrder: fallbackOrder,
          wsHost: this._resolveWsHost(this.shng_serverinfo.websocket_host),
          wsPort: this.shng_serverinfo.websocket_port ?? '',
        });

        if (!this.userPrefs.language && this.shng_serverinfo.default_language) {
          this.appConfig.patch({ defaultLanguage: this.shng_serverinfo.default_language });
        }
        if (this.shng_serverinfo.default_language) {
          this.userPrefs.cacheServerLanguage(this.shng_serverinfo.default_language);
        }

        const fallbackLang = this.shared.getFallbackLanguage();
        this.translate.setDefaultLang(fallbackLang);
        this.shared.setGuiLanguage();

        this.log.log('ServerApiService.getServerinfo(): config updated');
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ServerApiService.getServerinfo(): Could not read serverinfo data - ',
          err?.error?.error || err.message || err,
        );
        return of({} as ServerInfo);
      }),
    );
  }

  getShngServerStatus() {
    this.log.log('getShngServerStatus');
    const url = this.appConfig.apiUrl + 'server/status/';
    return this.http.get(url).pipe(
      map((response) => response),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ServerApiService (getShngServerStatus): Could not read server status - ',
          err?.error?.error || err.message || err,
        );
        return of({});
      }),
    );
  }

  restartShngServer() {
    this.log.log('restartShngServer');
    const url = this.appConfig.apiUrl + 'server/restart/';
    return this.http.put(url, JSON.stringify('')).pipe(
      map((response) => response),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ServerApiService (restartShngServer): Could not restart server - ',
          err?.error?.error || err.message || err,
        );
        return of({});
      }),
    );
  }

  getSystemStats() {
    const url = this.appConfig.apiUrl + 'system/info';
    return this.http.get(url).pipe(
      map((response) => response),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ServerApiService.getSystemStats(): Could not read system stats - ',
          err?.error?.error || err.message || err,
        );
        return of({});
      }),
    );
  }

  getPypiInfo() {
    const url = this.appConfig.apiUrl + 'server/pypi';
    return this.http.get(url).pipe(
      map((response) => response),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ServerApiService.getPypiInfo(): Could not read PyPI data - ',
          err?.error?.error || err.message || err,
        );
        return of([]);
      }),
    );
  }

  /**
   * Returns the host to use for the WebSocket connection.
   * Prefers the backend-configured websocket_host when it is a real address
   * (not a wildcard bind address). Falls back to the HTTP server's hostname
   * so that single-host deployments without an explicit websocket_host work.
   */
  private _resolveWsHost(websocketHost: string | undefined | null): string {
    if (websocketHost && websocketHost !== '0.0.0.0' && websocketHost !== '::') {
      return websocketHost;
    }
    return this.appConfig.hostIp;
  }

  downloadConfigBackup() {
    this.log.log('downloadConfigBackup');
    const url = this.appConfig.apiUrl + 'files/backup/';
    return this.http.get(url, { responseType: 'blob' }).pipe(
      map((response) => response),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ServerApiService (downloadConfigBackup): Could not download backup data - ',
          err?.error?.error || err.message || err,
        );
        return of({});
      }),
    );
  }
}
