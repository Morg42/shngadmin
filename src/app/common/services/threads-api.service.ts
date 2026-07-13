import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root',
})
export class ThreadsApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  getThreads() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'threads/';
    return this.http.get(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ThreadsApiService (getThreads): Could not read threads data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }
}
