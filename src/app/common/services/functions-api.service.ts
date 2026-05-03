
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { map, catchError } from 'rxjs/operators';
import {of} from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class FunctionsApiService {

  constructor(private http: HttpClient) { }


  getFunctions() {
    const apiUrl = sessionStorage.getItem('apiUrl');
    let url = apiUrl + 'functions/';
    return this.http.get(url)
        .pipe(
            map(response => {
              const result = response;
              return result;
            }),
            catchError((err: HttpErrorResponse) => {
              console.error('FunctionsApiService (getFunctions): Could not read function data' + ' - ' + err.error.error);
              return of({});
            })
        );
  }


  reloadFunction(name) {

    const apiUrl = sessionStorage.getItem('apiUrl');
    const url = apiUrl + 'functions/reload/' + name;

    return this.http.put(url, '', { responseType: 'text' })
        .pipe(
            map(response => {
              const result = <any>response;

              if (result) {
                // console.log('FunctionsApiService.reloadFunction', '\nresult', {result});
                return result;
              } else {
                // console.log('FunctionsApiService.reloadFunction', 'fail: undefined result');
                return '';
              }
            }),
            catchError((err: HttpErrorResponse) => {
              console.error('FunctionsApiService.reloadFunction: Could not set function config data' + ' - ' + err.error.error);
              return of({});
            })
        );

  }


  reloadFunctions() {

    const apiUrl = sessionStorage.getItem('apiUrl');
    const url = apiUrl + 'functions/reload/all';

    return this.http.put(url, '', { responseType: 'text' })
        .pipe(
            map(response => {
              const result = <any>response;

              if (result) {
                console.log('FunctionsApiService.reloadFunctions', '\nresult', {result});
                return result;
              } else {
                console.log('FunctionsApiService.reloadFunctions', 'fail: undefined result');
                return '';
              }
            }),
            catchError((err: HttpErrorResponse) => {
              console.error('FunctionsApiService.reloadFunctions: Could not set function config data' + ' - ' + err.error.error);
              return of({});
            })
        );

  }

}


