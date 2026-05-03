
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { LoggersType } from '../models/loggers-info';
import { ServerApiService } from './server-api.service';
import { map, catchError } from 'rxjs/operators';
import {of} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoggersApiService {


  constructor(private http: HttpClient) {
  }


  getLoggers() {
    const apiUrl = sessionStorage.getItem('apiUrl');
    let url = apiUrl + 'loggers/';
    return this.http.get<LoggersType>(url)
      .pipe(
        map(response => {
          const result = response;
          return result;
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('LoggersApiService (getLogs): Could not read logs data' + ' - ' + err.error.error);
          return of({});
        })
      );
  }


  setLoggerLevel(logger, level) {
    // console.log('LoggersApiService.setLoggerLevel');

    const apiUrl = sessionStorage.getItem('apiUrl');
    let url = apiUrl + 'loggers/' + logger + '?level=' + level;
    return this.http.put(url, 'level')
      .pipe(
        map(response => {
          const result = <any>response;

          if (result) {
            // console.log('ServicesApiService.ConvertToYamlText', '- config:', confText, '\nresult', {result});
            return result;
          } else {
            console.log('LoggersApiService.setLoggerLevel', 'fail: undefined result');
          }
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('LoggersApiService.setLoggerLevel: Could not set logger level' + ' - ' + err.error.error);
          return of({});
        })
      );
  }


  setHandlers(logger, handlerList) {
    // console.log('LoggersApiService.setHandlers');

    const apiUrl = sessionStorage.getItem('apiUrl');
    let url = apiUrl + 'loggers/' + logger + '?handlers=' + handlerList;
    return this.http.put(url, 'handlers')
      .pipe(
        map(response => {
          const result = <any>response;

          if (result) {
            // console.log('ServicesApiService.ConvertToYamlText', '- config:', confText, '\nresult', {result});
            return result;
          } else {
            console.log('LoggersApiService.setHandlers', 'fail: undefined result');
          }
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('LoggersApiService.setHandlers: Could not set logger level' + ' - ' + err.error.error);
          return of({});
        })
      );
  }


  addLogger(logger) {
        const apiUrl = sessionStorage.getItem('apiUrl');
        let url = apiUrl + 'loggers/' + logger + '/';
        return this.http.post(url, 'xxx')
            .pipe(
                map(response => {
                    const result = response;
                    return result;
                }),
                catchError((err: HttpErrorResponse) => {
                    console.error('LoggersApiService.addLogger(): Could not add logger \'' + logger + '\' - ' + err.error.error);
                    return of({});
                })
            );
    }


    deleteLogger(logger) {
        const apiUrl = sessionStorage.getItem('apiUrl');
        let url = apiUrl + 'loggers/' + logger + '/';
        return this.http.delete(url)
            .pipe(
                map(response => {
                    const result = response;
                    return result;
                }),
                catchError((err: HttpErrorResponse) => {
                    console.error('LoggersApiService.deleteLogger(): Could not delete logger \'' + logger + '\' - ' + err.error.error);
                    return of({});
                })
            );
    }


}
