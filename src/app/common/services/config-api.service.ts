import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  getConfig() {
    // this.log.log('ConfigApiService.getConfig');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'config/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ConfigApiService (getConfig): Could not read schedulers data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  saveConfig(data) {
    // this.log.log('ConfigApiService.saveConfig');

    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'config/core/';
    return this.http.put(url, JSON.stringify(data)).pipe(
      map((response) => {
        const result = response;

        if (result) {
          this.log.log('ConfigApiService.saveConfig', 'success', { result });
          return true;
        } else {
          this.log.log('ConfigApiService.saveConfig', 'fail');
          return false;
        }
      }),
    );
  }
}
