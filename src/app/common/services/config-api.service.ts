
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { map, catchError } from 'rxjs/operators';
import {of} from 'rxjs';
import {JwtHelperService} from '@auth0/angular-jwt';
import {AppConfigService} from './app-config.service';



@Injectable({
  providedIn: 'root'
})
export class ConfigApiService {

  constructor(private http: HttpClient,
              private appConfig: AppConfigService) { }


  getConfig() {
    // console.log('ConfigApiService.getConfig');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'config/';
    return this.http.get(url)
      .pipe(
        map(response => {
          const result = response;
          return result;
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('ConfigApiService (getConfig): Could not read schedulers data' + ' - ' + err.error.error);
          return of({});
        })
      );
  }

  saveConfig(data) {
    // console.log('ConfigApiService.saveConfig');

    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'config/core/';
    return this.http.put(url, JSON.stringify(data))
      .pipe(map(response => {
        const result = <any>response;

        if (result) {
          console.log('ConfigApiService.saveConfig', 'success', {result});
          return true;
        } else {
          console.log('ConfigApiService.saveConfig', 'fail');
          return false;
        }
      }));

  }
}


