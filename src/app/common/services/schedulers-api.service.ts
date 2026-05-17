import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root',
})
export class SchedulersApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  getSchedulers() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'schedulers/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'SchedulersApiService (getSchedulers): Could not read schedulers data' +
            ' - ' +
            err?.error?.error,
        );
        return of([]);
      }),
    );
  }
}
