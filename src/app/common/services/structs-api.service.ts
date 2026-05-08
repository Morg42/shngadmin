
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { map, catchError } from 'rxjs/operators';
import {of} from 'rxjs';
import {AppConfigService} from './app-config.service';



@Injectable({
  providedIn: 'root'
})
export class StructsApiService {

  constructor(private http: HttpClient,
              private appConfig: AppConfigService) { }


  getStructs() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'items/structs/';
    return this.http.get(url)
      .pipe(
        map(response => {
          const result = response;
          return result;
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('StructsApiService (getStructs): Could not read structs data' + ' - ' + err.error.error);
          return of({});
        })
      );
  }

}

