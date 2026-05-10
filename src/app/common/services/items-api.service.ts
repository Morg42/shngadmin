import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';

@Injectable({
  providedIn: 'root',
})
export class ItemsApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);

  getItemList() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'items/list/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'ItemsApiService (getItemList): Could not read itemlist data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }
}
