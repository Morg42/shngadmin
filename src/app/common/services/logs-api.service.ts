import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LogsType } from '../models/logfiles-info';
import { AppConfigService } from './app-config.service';
import { ServerApiService } from './server-api.service';

@Injectable({
  providedIn: 'root',
})
export class LogsApiService {
  private http = inject(HttpClient);
  private dataService = inject(ServerApiService);
  private appConfig = inject(AppConfigService);

  getLogs() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'logs/';
    return this.http.get<LogsType>(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'LogsApiService (getLogs): Could not read logs data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  readLogfile(filename: string, chunk: number | null = null) {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'logs/' + filename;
    let part = 0;
    if (apiUrl === null) {
      console.error('readLogfile for ' + filename + ' had an empty apiUrl');
      return of({} as object);
    }

    if (chunk === null) {
      part = 1;
    }
    url += '?chunk=' + String(part);

    // return this.http.get(url, { responseType: 'text' })
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error({ err });
        console.error(
          'LogsApiService (readLogfile): Could not read logfile ' +
            filename +
            ' - ' +
            err.error.error,
        );

        const result = {};
        result['file'] = filename;
        result['filesize'] = 0;
        result['chunk'] = 1;
        result['chunksize'] = 1000;
        result['lines'] = [1, 1];
        result['loglines'] = ['FILE NOT FOUND!'];
        return of(result);

        // return of('File not found!');
      }),
    );
  }
}
