import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LoggersType } from '../models/loggers-info';
import { AppConfigService } from './app-config.service';

@Injectable({
  providedIn: 'root',
})
export class LoggersApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);

  getLoggers() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'loggers/';
    return this.http.get<LoggersType>(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'LoggersApiService (getLogs): Could not read logs data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  setLoggerLevel(logger, level) {
    // console.log('LoggersApiService.setLoggerLevel');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'loggers/' + logger + '?level=' + level;
    return this.http.put(url, 'level').pipe(
      map((response) => {
        const result = response;

        if (result) {
          // console.log('ServicesApiService.ConvertToYamlText', '- config:', confText, '\nresult', {result});
          return result;
        } else {
          console.log('LoggersApiService.setLoggerLevel', 'fail: undefined result');
          return {};
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'LoggersApiService.setLoggerLevel: Could not set logger level' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  setHandlers(logger, handlerList) {
    // console.log('LoggersApiService.setHandlers');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'loggers/' + logger + '?handlers=' + handlerList;
    return this.http.put(url, 'handlers').pipe(
      map((response) => {
        const result = response;

        if (result) {
          // console.log('ServicesApiService.ConvertToYamlText', '- config:', confText, '\nresult', {result});
          return result;
        } else {
          console.log('LoggersApiService.setHandlers', 'fail: undefined result');
          return {};
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'LoggersApiService.setHandlers: Could not set logger level' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  addLogger(logger) {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'loggers/' + logger + '/';
    return this.http.post(url, 'xxx').pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          "LoggersApiService.addLogger(): Could not add logger '" +
            logger +
            "' - " +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  deleteLogger(logger) {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'loggers/' + logger + '/';
    return this.http.delete(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
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
