import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';

@Injectable({
  providedIn: 'root',
})
export class ScenesApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);

  getScenes() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'scenes/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ScenesApiService (getScenes): Could not read scenes data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  reloadScene(name) {
    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'scenes/reload/' + name;

    return this.http.put(url, '', { responseType: 'text' }).pipe(
      map((response) => {
        const result = response as string;

        if (result) {
          console.log('ScenesApiService.reloadScene', '\nresult', { result });
          return result;
        } else {
          console.log('ScenesApiService.reloadScene', 'fail: undefined result');
          return '';
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ScenesApiService.reloadScene: Could not set plugin config data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  reloadScenes() {
    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'scenes/reload/all';

    return this.http.put(url, '', { responseType: 'text' }).pipe(
      map((response) => {
        const result = response as string;

        if (result) {
          console.log('ScenesApiService.reloadScenes', '\nresult', { result });
          return result;
        } else {
          console.log('ScenesApiService.reloadScenes', 'fail: undefined result');
          return '';
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ScenesApiService.reloadScenes: Could not set plugin config data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }
}
