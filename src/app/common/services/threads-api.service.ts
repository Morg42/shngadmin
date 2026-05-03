
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { map, catchError } from 'rxjs/operators';
import {of} from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class ThreadsApiService {

  constructor(private http: HttpClient) { }


  getThreads() {
    const apiUrl = sessionStorage.getItem('apiUrl');
    let url = apiUrl + 'threads/';
    return this.http.get(url)
      .pipe(
        map(response => {
          const result = response;
          return result;
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('ThreadsApiService (getThreads): Could not read threads data' + ' - ' + err.error.error);
          return of({});
        })
      );
  }

}


