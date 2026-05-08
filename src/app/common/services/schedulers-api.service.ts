
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { map, catchError } from 'rxjs/operators';
import {of} from 'rxjs';
import {AppConfigService} from './app-config.service';



@Injectable({
  providedIn: 'root'
})
export class SchedulersApiService {

  constructor(private http: HttpClient,
              private appConfig: AppConfigService) { }


  getSchedulers() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'schedulers/';
    return this.http.get(url)
      .pipe(
        map(response => {
          const result = response;
          return result;
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('SchedulersApiService (getSchedulers): Could not read schedulers data' + ' - ' + err.error.error);
          return of({});
        })
      );
  }

}

