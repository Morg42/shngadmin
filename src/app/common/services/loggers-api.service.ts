import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LoggersApiResponse } from '../models/loggers-info';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root',
})
export class LoggersApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  getLoggers() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'loggers/';
    return this.http.get<LoggersApiResponse>(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LoggersApiService (getLogs): Could not read logs data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  setLoggerLevel(logger: string, level: string) {
    // this.log.log('LoggersApiService.setLoggerLevel');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'loggers/' + logger + '?level=' + level;
    return this.http.put(url, 'level').pipe(
      map((response) => {
        const result = response;

        if (result) {
          // this.log.log('ServicesApiService.ConvertToYamlText', '- config:', confText, '\nresult', {result});
          return result;
        } else {
          this.log.log('LoggersApiService.setLoggerLevel', 'fail: undefined result');
          return {};
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LoggersApiService.setLoggerLevel: Could not set logger level' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  setHandlers(logger: string, handlerList: string) {
    // this.log.log('LoggersApiService.setHandlers');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'loggers/' + logger + '?handlers=' + handlerList;
    return this.http.put(url, 'handlers').pipe(
      map((response) => {
        const result = response;

        if (result) {
          // this.log.log('ServicesApiService.ConvertToYamlText', '- config:', confText, '\nresult', {result});
          return result;
        } else {
          this.log.log('LoggersApiService.setHandlers', 'fail: undefined result');
          return {};
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LoggersApiService.setHandlers: Could not set logger level' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  addLogger(logger: string) {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'loggers/' + logger + '/';
    return this.http.post(url, 'xxx').pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          "LoggersApiService.addLogger(): Could not add logger '" +
            logger +
            "' - " +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  deleteLogger(logger: string) {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'loggers/' + logger + '/';
    return this.http.delete(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          "LoggersApiService.deleteLogger(): Could not delete logger '" +
            logger +
            "' - " +
            err.error.error,
        );
        return of({});
      }),
    );
  }
}
