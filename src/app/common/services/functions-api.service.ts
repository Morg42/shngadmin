import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root',
})
export class FunctionsApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  getFunctions() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'functions/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'FunctionsApiService (getFunctions): Could not read function data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  reloadFunction(name: string) {
    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'functions/reload/' + name;

    return this.http.put(url, '', { responseType: 'text' }).pipe(
      map((response) => {
        const result = response;

        if (result) {
          // this.log.log('FunctionsApiService.reloadFunction', '\nresult', {result});
          return result;
        } else {
          // this.log.log('FunctionsApiService.reloadFunction', 'fail: undefined result');
          return '';
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'FunctionsApiService.reloadFunction: Could not set function config data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  reloadFunctions() {
    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'functions/reload/all';

    return this.http.put(url, '', { responseType: 'text' }).pipe(
      map((response) => {
        const result = response;

        if (result) {
          this.log.log('FunctionsApiService.reloadFunctions', '\nresult', { result });
          return result;
        } else {
          this.log.log('FunctionsApiService.reloadFunctions', 'fail: undefined result');
          return '';
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'FunctionsApiService.reloadFunctions: Could not set function config data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }
}
