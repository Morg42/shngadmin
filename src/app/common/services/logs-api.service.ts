import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LogsType } from '../models/logfiles-info';
import { MemlogResponse } from '../models/memlog-entry';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';
import { ServerApiService } from './server-api.service';

@Injectable({
  providedIn: 'root',
})
export class LogsApiService {
  private http = inject(HttpClient);
  private dataService = inject(ServerApiService);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  getLogs() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'logs/';
    return this.http.get<LogsType>(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LogsApiService (getLogs): Could not read logs data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  readLogfile(filename: string, chunk: number | null = null) {
    const apiUrl = this.appConfig.apiUrl;
    if (!apiUrl) {
      this.log.error('readLogfile for ' + filename + ' had an empty apiUrl');
      return of({} as object);
    }
    // chunk=null → 1 (first); chunk=0 → 0 (server convention for last chunk)
    const part = chunk ?? 1;
    let url = apiUrl + 'logs/' + encodeURIComponent(filename) + '?chunk=' + String(part);

    // return this.http.get(url, { responseType: 'text' })
    return this.http.get(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error({ err });
        this.log.error(
          'LogsApiService (readLogfile): Could not read logfile ' +
            filename +
            ' - ' +
            err.error.error,
        );

        const result: Record<string, unknown> = {};
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

  /** Tail of an in-memory log (e.g. 'env.core.log', the root WARNING+
   *  buffer) - see modules/admin/api_logs.py's LogsController.read(),
   *  which recognizes registered memory-log names before falling back
   *  to the file lookup readLogfile() above uses.
   *
   *  Returns null on error rather than a fake `{entries: []}` success
   *  shape - the dashboard widget polling this needs to tell "the log is
   *  genuinely quiet" apart from "the request failed", which an empty
   *  array can't do on its own. */
  getMemlogTail(name: string, count = 10) {
    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'logs/' + encodeURIComponent(name) + '?count=' + String(count);
    return this.http.get<MemlogResponse>(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LogsApiService (getMemlogTail): Could not read memlog ' + name + ' - ' + err.error.error,
        );
        return of(null);
      }),
    );
  }
}
