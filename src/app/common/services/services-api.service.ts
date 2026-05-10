import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';

interface EvalResult {
  expression: string;
  type: string;
  result: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class ServicesApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);

  // -----------------------------------------------------------
  //  Send eval data to check if it is conform to Python specification
  //
  CheckEvalData(evalData) {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'services/evalcheck/';
    return this.http.put<EvalResult>(url, evalData).pipe(
      map((response) => {
        const result = response;

        if (result) {
          // console.log('ServicesApiService.CheckEvalData', '- config:', evalData, '\nresult', {result});
          return result;
        } else {
          console.log('ServicesApiService.CheckEvalData', 'fail: undefined result');
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ServicesApiService.CheckEvalData: Could not set plugin config data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  // -----------------------------------------------------------
  //  Send yaml text to check if it is conform to specification
  //
  CheckYamlText(yamlText) {
    // console.log('ServicesApiService.CheckYamlText');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'services/yamlcheck/';
    return this.http.put(url, yamlText, { responseType: 'text' }).pipe(
      map((response) => {
        const result = response;

        if (result) {
          // console.log('ServicesApiService.CheckYamlText', '- config:', yamlText, '\nresult', {result});
          return result;
        } else {
          console.log('ServicesApiService.CheckYamlText', 'fail: undefined result');
          return '';
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ServicesApiService.CheckYamlText: Could not set plugin config data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  // -----------------------------------------------------------
  //  Send yaml text to check if it is conform to specification
  //
  ConvertToYamlText(confText) {
    // console.log('ServicesApiService.CheckYamlText');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'services/yamlconvert/';
    return this.http.put(url, confText, { responseType: 'text' }).pipe(
      map((response) => {
        const result = response;

        if (result) {
          // console.log('ServicesApiService.ConvertToYamlText', '- config:', confText, '\nresult', {result});
          return result;
        } else {
          console.log('ServicesApiService.ConvertToYamlText', 'fail: undefined result');
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ServicesApiService.ConvertToYamlText: Could not set plugin config data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  getCacheOrphans() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'services/cachecheck/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ServicesApiService (getCacheOrphans): Could not read cache orphans data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  deleteCacheFile(filename) {
    // console.log('ServicesApiService.deleteCacheFile');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'services/cachefile_delete?filename=' + filename;
    return this.http.put(url, 'xxx').pipe(
      map((response) => {
        const result = response;

        if (result) {
          // console.log('ServicesApiService.ConvertToYamlText', '- config:', confText, '\nresult', {result});
          return result;
        } else {
          console.log('ServicesApiService.deleteCacheFile', 'fail: undefined result');
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ServicesApiService.deleteCacheFile: Could not set plugin config data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }
}
