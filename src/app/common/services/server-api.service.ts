import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { TranslateService } from '@ngx-translate/core';
import { ServerInfo } from '../models/server-info';
import { AppConfigService } from './app-config.service';
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

    this.getServerBasicinfo().subscribe(
      (response: ServerInfo) => {
        this.shng_serverinfo = response;
      },
      (error) => {
        console.warn('DataService: getShngServerinfo():', { error });
      },
    );
  }

  getServerBasicinfo() {
    const url = this.appConfig.apiUrl + 'server/';
    console.log('ServerApiService.getServerBasicinfo() using url', url);
    return this.http.get(url).pipe(
      tap((response) => console.log('getServerBasicinfo response:', response)),
      map((response) => {
        this.shng_serverinfo = response as ServerInfo;
        const result = response as ServerInfo;

        // Only apply the server's language if the user has no saved preference.
        // (The old guard checked appConfig.defaultLanguage which is never empty
        //  because DEFAULT_CONFIG seeds it to 'en' — so it silently did nothing.)
        if (!this.userPrefs.language) {
          this.appConfig.patch({ defaultLanguage: result.default_language });
          this.translate.setDefaultLang(this.shared.getFallbackLanguage());
          this.shared.setGuiLanguage();
        }

        this.appConfig.patch({
          clientIp: result.client_ip,
          wsHost: this.appConfig.hostIp,
        });

        this.shared.setGuiLanguage();
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ServerApiService.getServerBasicinfo(): Could not read serverinfo data - ',
          err?.error?.error || err.message || err,
        );
        return of({} as ServerInfo);
      }),
    );
  }

  getServerinfo() {
    console.log('ServerApiService.getServerinfo() called');
    const url = this.appConfig.apiUrl + 'server/info';
    console.log('ServerApiService.getServerinfo() using url', url);
    return this.http.get(url).pipe(
      tap((response) => console.log('ServerApiService.getServerinfo() response:', response)),
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
          fallbackLanguageOrder: fallbackOrder,
          wsHost: this.appConfig.hostIp,
          wsPort: this.shng_serverinfo.websocket_port,
        });

        if (!this.userPrefs.language) {
          this.appConfig.patch({ defaultLanguage: this.shng_serverinfo.default_language });
        }

        const fallbackLang = this.shared.getFallbackLanguage();
        this.translate.setDefaultLang(fallbackLang);
        this.shared.setGuiLanguage();

        console.log('ServerApiService.getServerinfo(): config updated');
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ServerApiService.getServerinfo(): Could not read serverinfo data - ',
          err?.error?.error || err.message || err,
        );
        return of({} as ServerInfo);
      }),
    );
  }

  getShngServerStatus() {
    console.log('getShngServerStatus');
    const url = this.appConfig.apiUrl + 'server/status/';
    return this.http.get(url).pipe(
      map((response) => response),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ServerApiService (getShngServerStatus): Could not read server status - ',
          err?.error?.error || err.message || err,
        );
        return of({});
      }),
    );
  }

  restartShngServer() {
    console.log('restartShngServer');
    const url = this.appConfig.apiUrl + 'server/restart/';
    return this.http.put(url, JSON.stringify('')).pipe(
      map((response) => response),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ServerApiService (restartShngServer): Could not restart server - ',
          err?.error?.error || err.message || err,
        );
        return of({});
      }),
    );
  }

  downloadConfigBackup() {
    console.log('downloadConfigBackup');
    const url = this.appConfig.apiUrl + 'files/backup/';
    return this.http.get(url, { responseType: 'blob' }).pipe(
      map((response) => response),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ServerApiService (downloadConfigBackup): Could not download backup data - ',
          err?.error?.error || err.message || err,
        );
        return of({});
      }),
    );
  }
}
